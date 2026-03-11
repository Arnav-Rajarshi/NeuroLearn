# ─── NeuroLearn · Performance Dashboard · Analytics Service ───────────────────
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import json


class AnalyticsService:
    """
    Service for computing learning analytics metrics.
    
    Calculates:
    - STREAK: continuous learning days
    - VELOCITY: topics per week
    - GOAL PREDICTION: estimated completion date
    - PROGRESS TREND: weekly progress for graphs
    """
    
    @staticmethod
    def compute_streak(daily_progress: List[Dict[str, Any]]) -> int:
        """
        Compute continuous learning streak (consecutive days with activity).
        
        Args:
            daily_progress: List of {"date": "YYYY-MM-DD", "completed": int}
        
        Returns:
            Number of consecutive active days ending at today/yesterday
        """
        if not daily_progress:
            return 0
        
        # Sort by date descending
        sorted_progress = sorted(
            daily_progress, 
            key=lambda x: x.get("date", ""), 
            reverse=True
        )
        
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        streak = 0
        expected_date = today
        
        for entry in sorted_progress:
            try:
                entry_date = datetime.strptime(entry.get("date", ""), "%Y-%m-%d").date()
                completed = entry.get("completed", 0)
                
                # Allow starting from today or yesterday
                if streak == 0:
                    if entry_date == today and completed > 0:
                        streak = 1
                        expected_date = today - timedelta(days=1)
                    elif entry_date == yesterday and completed > 0:
                        streak = 1
                        expected_date = yesterday - timedelta(days=1)
                    elif entry_date < yesterday:
                        # Check if this is the start of a historical streak
                        if completed > 0:
                            streak = 1
                            expected_date = entry_date - timedelta(days=1)
                        else:
                            continue
                else:
                    # Continue counting streak
                    if entry_date == expected_date and completed > 0:
                        streak += 1
                        expected_date = expected_date - timedelta(days=1)
                    elif entry_date < expected_date:
                        # Gap found, streak broken
                        break
            except (ValueError, TypeError):
                continue
        
        return streak
    
    @staticmethod
    def compute_weekly_velocity(weekly_progress: List[Dict[str, Any]]) -> float:
        """
        Compute average topics completed per week.
        
        Args:
            weekly_progress: List of {"week": int, "topics": int}
        
        Returns:
            Average topics per week
        """
        if not weekly_progress:
            return 0.0
        
        total_topics = sum(w.get("topics", 0) for w in weekly_progress)
        weeks = len(weekly_progress)
        
        return round(total_topics / weeks, 2) if weeks > 0 else 0.0
    
    @staticmethod
    def compute_goal_prediction(
        completed_topics: int,
        total_topics: int,
        velocity: float,
        goal_date: Optional[str],
        hrs_per_week: float = 10.0
    ) -> Dict[str, Any]:
        """
        Predict goal completion status and estimated date.
        
        Args:
            completed_topics: Number of topics completed
            total_topics: Total topics in all courses
            velocity: Topics per week
            goal_date: Target completion date (YYYY-MM-DD)
            hrs_per_week: Study hours per week
        
        Returns:
            Dictionary with prediction details
        """
        remaining = total_topics - completed_topics
        
        # Calculate days needed at current velocity
        if velocity > 0:
            weeks_needed = remaining / velocity
            days_needed = int(weeks_needed * 7)
        else:
            days_needed = float('inf')
        
        today = date.today()
        
        # Calculate predicted completion date
        if days_needed != float('inf'):
            predicted_date = today + timedelta(days=days_needed)
        else:
            predicted_date = today + timedelta(days=365)  # Default to 1 year
        
        # Parse goal date
        if goal_date:
            try:
                if isinstance(goal_date, str):
                    deadline = datetime.strptime(goal_date, "%Y-%m-%d").date()
                else:
                    deadline = goal_date
            except (ValueError, TypeError):
                deadline = today + timedelta(days=90)  # Default 3 months
        else:
            deadline = today + timedelta(days=90)
        
        # Calculate buffer days
        days_buffer = (deadline - predicted_date).days
        
        # Determine status
        if days_buffer >= 7:
            status = "on_track"
        elif days_buffer >= 0:
            status = "close"
        else:
            status = "behind"
        
        # Calculate extra minutes needed if behind
        extra_minutes_per_day = None
        if status == "behind":
            days_until_deadline = (deadline - today).days
            if days_until_deadline > 0 and velocity > 0:
                # Topics per day needed
                required_daily_topics = remaining / days_until_deadline
                current_daily_topics = velocity / 7
                
                # Assuming linear relationship between time and topics
                if current_daily_topics > 0:
                    extra_ratio = required_daily_topics / current_daily_topics
                    current_daily_hours = hrs_per_week / 7
                    required_daily_hours = current_daily_hours * extra_ratio
                    extra_hours = required_daily_hours - current_daily_hours
                    extra_minutes_per_day = max(1, int(extra_hours * 60))
        
        return {
            "predicted_date": predicted_date.strftime("%Y-%m-%d"),
            "deadline": deadline.strftime("%Y-%m-%d"),
            "status": status,
            "days_needed": days_needed if days_needed != float('inf') else 9999,
            "days_buffer": days_buffer,
            "extra_minutes_per_day": extra_minutes_per_day
        }
    
    @staticmethod
    def generate_progress_history(
        weekly_progress: List[Dict[str, Any]], 
        total_topics: int
    ) -> List[Dict[str, Any]]:
        """
        Generate progress history data for ProgressTrendGraph.
        
        Args:
            weekly_progress: List of {"week": int, "topics": int}
            total_topics: Total topics across all courses
        
        Returns:
            List of {"week": str, "completed": int}
        """
        if not weekly_progress:
            return []
        
        return [
            {
                "week": f"Week {w.get('week', i+1)}",
                "completed": w.get("topics", 0)
            }
            for i, w in enumerate(weekly_progress)
        ]
    
    @staticmethod
    def generate_velocity_data(
        daily_progress: List[Dict[str, Any]],
        total_study_hours: float = 0.0,
        todays_hours: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Generate velocity data for CompactVelocityChart.
        
        Uses daily progress data to create study hour patterns.
        
        Args:
            daily_progress: List of {"date": "YYYY-MM-DD", "completed": int}
            total_study_hours: Total study hours (for avg calculation)
            todays_hours: Today's study hours
        
        Returns:
            List of {"date": str, "hours": float, "sma": float}
        """
        if not daily_progress:
            # Generate default pattern
            return AnalyticsService._generate_default_velocity_data(
                total_study_hours, todays_hours
            )
        
        # Sort by date
        sorted_progress = sorted(
            daily_progress,
            key=lambda x: x.get("date", "")
        )
        
        # Convert topics completed to estimated study hours
        # Assuming ~0.3 hours per topic on average
        HOURS_PER_TOPIC = 0.3
        
        today = date.today()
        result = []
        
        # Take last 21 days of data
        for entry in sorted_progress[-21:]:
            try:
                entry_date = datetime.strptime(
                    entry.get("date", ""), "%Y-%m-%d"
                ).date()
                completed = entry.get("completed", 0)
                hours = round(completed * HOURS_PER_TOPIC, 1)
                
                result.append({
                    "date": entry_date.strftime("%b %d"),
                    "hours": hours
                })
            except (ValueError, TypeError):
                continue
        
        # Add SMA (Simple Moving Average)
        SMA_WINDOW = 5
        for i, entry in enumerate(result):
            window = result[max(0, i - SMA_WINDOW + 1):i + 1]
            sma = sum(w["hours"] for w in window) / len(window)
            entry["sma"] = round(sma, 2)
        
        return result if result else AnalyticsService._generate_default_velocity_data(
            total_study_hours, todays_hours
        )
    
    @staticmethod
    def _generate_default_velocity_data(
        total_study_hours: float,
        todays_hours: float
    ) -> List[Dict[str, Any]]:
        """Generate default velocity data pattern."""
        PATTERN = [
            0.8, 1.1, 0.6, 1.3, 0.0, 1.5, 1.0,
            0.9, 1.2, 0.7, 1.4, 0.0, 1.1, 0.8,
            1.0, 1.3, 0.5, 1.5, 0.0, 1.2, todays_hours
        ]
        
        today = date.today()
        n = len(PATTERN)
        
        result = []
        for i, hours in enumerate(PATTERN):
            d = today - timedelta(days=n - 1 - i)
            result.append({
                "date": d.strftime("%b %d"),
                "hours": hours
            })
        
        # Add SMA
        SMA_WINDOW = 5
        for i, entry in enumerate(result):
            window = result[max(0, i - SMA_WINDOW + 1):i + 1]
            sma = sum(w["hours"] for w in window) / len(window)
            entry["sma"] = round(sma, 2)
        
        return result
    
    @staticmethod
    def calculate_total_study_hours(
        daily_progress: List[Dict[str, Any]],
        hrs_per_week: float = 10.0
    ) -> tuple[float, float]:
        """
        Calculate total and today's study hours from progress data.
        
        Returns:
            Tuple of (total_hours, todays_hours)
        """
        HOURS_PER_TOPIC = 0.3
        
        if not daily_progress:
            return (hrs_per_week * 4, 0.0)  # Default 4 weeks of study
        
        total_topics = sum(d.get("completed", 0) for d in daily_progress)
        total_hours = round(total_topics * HOURS_PER_TOPIC, 1)
        
        today_str = date.today().strftime("%Y-%m-%d")
        todays_topics = 0
        
        for entry in daily_progress:
            if entry.get("date") == today_str:
                todays_topics = entry.get("completed", 0)
                break
        
        todays_hours = round(todays_topics * HOURS_PER_TOPIC, 1)
        
        return (max(total_hours, 0.1), todays_hours)
