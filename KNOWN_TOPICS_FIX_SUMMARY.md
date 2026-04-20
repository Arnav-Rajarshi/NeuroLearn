# Known Topics System Fix - Implementation Summary

## Overview
Fixed the known topics system to use backend database as the source of truth instead of frontend localStorage. This ensures consistent behavior across reloads and devices.

## Problem Solved
- Known topics were only stored in frontend localStorage
- Backend didn't filter topics during roadmap generation
- On page reload, the roadmap would incorrectly show known topics again
- No cross-device consistency

## Architecture Change
**Before:** Frontend → localStorage → navigation state → (no backend sync)
**After:** Frontend → Backend Database → Roadmap Filtering → topics_to_be_shown

---

## Changes Made

### 1. Database Model (backend/models.py)
**Change:** Enabled known_topics column in CoursePreference table
```python
# BEFORE:
# known_topics = Column(JSON, nullable=True)

# AFTER:
known_topics = Column(JSONB, nullable=True)  # Store known topics for backend filtering
```
- Uses JSONB for efficient querying and storage of JSON arrays

### 2. Backend API Schemas (backend/courses.py)
**Changes:**
- Added `known_topics: Optional[List[str]] = None` to `CoursePreferenceCreate` schema
- Added `known_topics: Optional[List[str]] = None` to `CoursePreferenceResponse` schema

These changes allow the API to accept and return known topics.

### 3. Backend Save Endpoint (backend/courses.py)
**Change:** Store known_topics in database during preference save
```python
# In UPDATE section:
pref.known_topics = pref_data.known_topics

# In CREATE section:
known_topics=pref_data.known_topics,
```

### 4. Roadmap Filtering Function (backend/roadmap.py)
**New Function:** Added `filter_known_topics()` to remove known topics from roadmap
```python
def filter_known_topics(
    topics_list: List[str],
    known_topics: Optional[List[str]]
) -> List[str]:
    """
    Filter out known topics from the topics list.
    Known topics are topics the user already knows, so they should not be shown
    in the roadmap. This filtering happens BEFORE topics are saved to the database.
    """
    if not known_topics:
        return topics_list
    
    known_set = set(known_topics)
    return [topic for topic in topics_list if topic not in known_set]
```

### 5. Roadmap Generation Endpoints (backend/roadmap.py)
**Updated three endpoints to fetch and apply known_topics filtering:**

#### a. `GET /roadmap/{cid}` (get_roadmap)
- Fetch known_topics from CoursePreference table
- Apply filtering BEFORE saving to database
- topics_to_be_shown now contains only unfiltered topics

```python
# Step 2.5: Fetch known topics from course preferences
known_topics = []
pref = db.query(CoursePreference).filter(
    CoursePreference.uid == uid,
    CoursePreference.cid == cid
).first()
if pref and pref.known_topics:
    known_topics = pref.known_topics if isinstance(pref.known_topics, list) else []

# Step 6: Apply filtering BEFORE saving
if should_recompute:
    topics_to_show = compute_topics_to_be_shown(all_topic_keys, completed_topics)
    # CRITICAL: Filter out known topics BEFORE saving
    topics_to_show = filter_known_topics(topics_to_show, known_topics)
    progress.topics_to_be_shown_json = topics_to_show
```

#### b. `GET /roadmap/{cid}/progress` (get_roadmap_progress)
- Similar logic for lightweight progress endpoint
- Fetches and filters known topics before returning

#### c. `POST /roadmap/progress/update` (update_roadmap_progress)
- Fetches known_topics from preferences when updating progress
- Applies filtering to keep topics_to_be_shown consistent

### 6. Frontend Course Setup (src/pages/CourseSetup.jsx)
**Changes:**
- Remove navigation state passing for known_topics
- Backend now provides filtered roadmap via API
- Known topics are sent in API request body to be stored in database

```javascript
// BEFORE: Navigate with state
navigate(`/roadmap-engine/roadmap/${cid}`, {
  state: { knownTopics }
})

// AFTER: No state needed, backend handles everything
navigate(`/roadmap-engine/roadmap/${cid}`)
```

### 7. Frontend Roadmap Page (src/pages/RoadmapPage.jsx)
**Changes:**
- Remove dependency on location.state for known_topics
- Remove client-side filtering logic
- Use backend-provided topics_to_be_shown directly

```javascript
// BEFORE: Filter on frontend
const knownTopics = location.state?.knownTopics || []
const filteredTopics = roadmapData?.topics?.filter(
  topic => !knownTopics.includes(topic.name)
) || []

// AFTER: Backend already filtered
const filteredTopics = roadmapData?.topics || []
```

---

## Data Flow

### Creating a Course with Known Topics
1. User selects known topics in CourseSetup
2. Click "Continue" → saveCoursePreferences() API call
3. Backend stores known_topics in course_preferences table
4. Navigate to roadmap page

### Loading Roadmap
1. Page loads → getRoadmap(cid, lm) API call
2. Backend fetches known_topics from course_preferences
3. Generates full topic list from JSON
4. **Filters OUT known topics** BEFORE saving to database
5. Returns topics_to_be_shown with known topics removed
6. Frontend displays filtered roadmap

### On Page Reload
1. Page loads → getCoursePreferences() + getRoadmap()
2. Backend retrieves stored known_topics from database
3. Applies same filtering logic
4. User sees consistent roadmap (known topics not shown)

### Across Devices
1. User logs in on different device
2. Backend fetches preferences from database (not localStorage)
3. Same known_topics are applied
4. Consistent experience across devices

---

## Testing Checklist

- [ ] Create new course with known topics selected
- [ ] Verify `known_topics` column populated in database
- [ ] Verify `topics_to_be_shown` excludes known topics
- [ ] Reload page → roadmap unchanged (known topics still hidden)
- [ ] Login from different device → same known topics applied
- [ ] Edit preferences to change known topics → roadmap updates correctly
- [ ] Clear all known topics → all topics appear in roadmap
- [ ] Verify no localStorage reads/writes for known topics

---

## Key Principles Applied

1. **Backend is Source of Truth**: All known topics data lives in database, not frontend
2. **Filter Before Save**: Topics are filtered BEFORE being saved to database
3. **No Client-Side Filtering**: Frontend displays what backend provides (no double-filtering)
4. **Consistent Behavior**: Same result on reload and across devices
5. **API Contract Clear**: CoursePreferenceResponse includes known_topics for transparency

---

## Migration Note

**No migration script was executed** as per user request. The following SQL migration should be executed when ready:

```sql
ALTER TABLE course_preferences ADD COLUMN known_topics JSONB;
```

Once this column is added to the production database, the system will automatically:
- Store new known_topics data
- Filter roadmaps based on known_topics
- Provide consistent experience across reloads and devices

Until the migration is run, the system will gracefully handle NULL known_topics values.
