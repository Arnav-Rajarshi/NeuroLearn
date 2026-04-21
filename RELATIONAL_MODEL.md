# NeuroLearn Database Relational Model

## Overview

This document describes the PostgreSQL database schema for the NeuroLearn learning platform. The schema supports user authentication, course management, learning roadmaps, progress tracking, and payment processing.

---

## Entity Relationship Diagram (Text)

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   users     │─────────│ courses_enrolled │─────────│   courses    │
│   (uid)     │    1:N  │   (uid, cid)    │    N:1  │    (cid)     │
└─────────────┘         └─────────────────┘         └──────────────┘
      │                                                     │
      │ 1:N                                                 │ 1:N
      ▼                                                     ▼
┌─────────────┐                                    ┌──────────────┐
│  payments   │                                    │   roadmaps   │
│(payment_id) │                                    │    (rid)     │
└─────────────┘                                    └──────────────┘
      │                                                     │
      │                                                     │ 1:N
      │                                                     ▼
      │                                         ┌────────────────────┐
      │                                         │ topics_to_be_shown │
      │                                         │     (top_id)       │
      │                                         └────────────────────┘
      │                                                     │
      │         ┌───────────────────┐                       │
      │         │  progress_level   │◄──────────────────────┘
      └────────►│   (progress_id)   │
                └───────────────────┘
                         ▲
                         │
                ┌───────────────────┐
                │ course_preferences│
                │    (pref_id)      │
                └───────────────────┘
```

---

## Tables

### 1. users
Primary table for user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| uid | INTEGER | PRIMARY KEY | Unique user identifier |
| name | VARCHAR | NULLABLE | User's display name |
| email | VARCHAR | UNIQUE, NOT NULL | User's email address |
| password_hash | VARCHAR | NOT NULL | Bcrypt hashed password |
| acc_status | VARCHAR | DEFAULT 'free' | Account status: 'free' or 'premium' |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |

### 2. courses
Available courses in the platform.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| cid | INTEGER | PRIMARY KEY | Unique course identifier |
| course_name | VARCHAR | NOT NULL | Name of the course |

### 3. roadmaps
Learning roadmaps for each course.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| rid | INTEGER | PRIMARY KEY | Unique roadmap identifier |
| cid | INTEGER | FOREIGN KEY (courses.cid) | Associated course |
| lm | VARCHAR | NOT NULL | Learning mode: 'PNL' or 'PRACTICE' |

### 4. courses_enrolled
Junction table for user course enrollments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| uid | INTEGER | PRIMARY KEY, FOREIGN KEY (users.uid) | Enrolled user |
| cid | INTEGER | PRIMARY KEY, FOREIGN KEY (courses.cid) | Enrolled course |
| enrolled_at | TIMESTAMP | DEFAULT NOW() | Enrollment timestamp |

### 5. topics_to_be_shown
Topics generated for user roadmaps.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| top_id | INTEGER | PRIMARY KEY | Unique topic set identifier |
| uid | INTEGER | FOREIGN KEY (users.uid) | User who owns this topic set |
| rid | INTEGER | FOREIGN KEY (roadmaps.rid) | Associated roadmap |
| topics_json | JSONB | NULLABLE | JSON array of topic data |

### 6. progress_level
User progress tracking for courses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| progress_id | INTEGER | PRIMARY KEY | Unique progress record identifier |
| uid | INTEGER | FOREIGN KEY (users.uid) | User whose progress is tracked |
| cid | INTEGER | FOREIGN KEY (courses.cid) | Course being tracked |
| top_id | INTEGER | FOREIGN KEY (topics_to_be_shown.top_id) | Associated topic set |
| progress_json | JSONB | NULLABLE | JSON object with progress data |
| last_updated | TIMESTAMP | DEFAULT NOW() | Last progress update |

### 7. course_preferences
User preferences for course learning.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| pref_id | INTEGER | PRIMARY KEY | Unique preference identifier |
| uid | INTEGER | FOREIGN KEY (users.uid) | User who set preferences |
| cid | INTEGER | FOREIGN KEY (courses.cid) | Associated course |
| rid | INTEGER | FOREIGN KEY (roadmaps.rid) | Chosen roadmap |
| lm | VARCHAR | NULLABLE | Learning mode preference |
| goal_date | DATE | NULLABLE | Target completion date |
| hrs_per_week | INTEGER | NULLABLE | Weekly study hours |
| top_id | INTEGER | FOREIGN KEY (topics_to_be_shown.top_id) | Selected topic set |

### 8. payments
Payment records for premium subscriptions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| payment_id | INTEGER | PRIMARY KEY | Unique payment identifier |
| uid | INTEGER | FOREIGN KEY (users.uid) | User who made payment |
| amount | NUMERIC(10,2) | NOT NULL | Payment amount in rupees |
| razor_id | VARCHAR | NULLABLE | Razorpay payment ID (set after verification) |
| order_id | VARCHAR | NULLABLE | Razorpay order ID |
| created_at | TIMESTAMP | DEFAULT NOW() | Payment creation timestamp |

---

## Relationships

### User Relationships
- **User → Payments** (1:N): A user can have multiple payment records
- **User → CourseEnrolled** (1:N): A user can enroll in multiple courses
- **User → ProgressLevel** (1:N): A user can have progress in multiple courses
- **User → TopicsToBeShown** (1:N): A user can have multiple topic sets
- **User → CoursePreference** (1:N): A user can have preferences for multiple courses

### Course Relationships
- **Course → Roadmaps** (1:N): A course can have multiple roadmaps (PNL, PRACTICE)
- **Course → CourseEnrolled** (1:N): A course can have multiple enrolled users
- **Course → ProgressLevel** (1:N): A course can have progress records from multiple users
- **Course → CoursePreference** (1:N): A course can have preferences from multiple users

### Roadmap Relationships
- **Roadmap → TopicsToBeShown** (1:N): A roadmap can generate multiple topic sets
- **Roadmap → CoursePreference** (1:N): A roadmap can be chosen in multiple preferences

### Topic Relationships
- **TopicsToBeShown → ProgressLevel** (1:N): A topic set can have multiple progress entries
- **TopicsToBeShown → CoursePreference** (1:N): A topic set can be referenced in preferences

---

## Data Flow

### User Registration & Login
```
Frontend (SignupPage/LoginPage)
    ↓
POST /auth/signup or /auth/login
    ↓
auth.py (create/verify user)
    ↓
users table (insert/select)
    ↓
JWT token returned to frontend
```

### Course Enrollment & Roadmap Generation
```
User selects course
    ↓
courses_enrolled (uid, cid)
    ↓
Generate roadmap based on learning mode
    ↓
roadmaps (rid, cid, lm)
    ↓
Generate topics for user
    ↓
topics_to_be_shown (top_id, uid, rid, topics_json)
    ↓
Store preferences
    ↓
course_preferences (pref_id, uid, cid, rid, ...)
```

### Progress Tracking
```
User completes topic/quiz
    ↓
POST /progress/update
    ↓
progress.py (upsert progress)
    ↓
progress_level (progress_json updated)
    ↓
Frontend dashboard updated
```

### Premium Payment Flow
```
User initiates payment
    ↓
GET /payments/create-order
    ↓
payments table (order_id stored, razor_id null)
    ↓
Razorpay checkout
    ↓
POST /payments/verify-payment
    ↓
payments table (razor_id updated)
    ↓
users table (acc_status = 'premium')
```

---

## Key Schema Changes (Migration Notes)

The following changes were made from the old schema:

| Old Field | New Field | Table |
|-----------|-----------|-------|
| id | uid | users |
| username | name | users |
| premium (boolean) | acc_status (string) | users |
| last_login | removed | users |
| user_id | uid | payments, progress_level |
| course_name | cid (FK) | progress_level |
| progress (old table) | progress_level | - |
| status | removed | payments |

---

## Index Recommendations

For optimal query performance:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_enrolled_uid ON courses_enrolled(uid);
CREATE INDEX idx_courses_enrolled_cid ON courses_enrolled(cid);
CREATE INDEX idx_progress_level_uid ON progress_level(uid);
CREATE INDEX idx_progress_level_cid ON progress_level(cid);
CREATE INDEX idx_payments_uid ON payments(uid);
CREATE INDEX idx_roadmaps_cid ON roadmaps(cid);
CREATE INDEX idx_topics_uid ON topics_to_be_shown(uid);
```
