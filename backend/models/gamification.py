from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional
import sqlite3
import json
import os

DATABASE_PATH = "gamification.db"

@dataclass
class User:
    user_id: str
    username: str
    email: str
    total_points: int = 0
    level: int = 1
    streak_days: int = 0
    last_active: datetime = None
    created_at: datetime = None

@dataclass
class PointTransaction:
    transaction_id: str
    user_id: str
    points_earned: int
    activity_type: str
    timestamp: datetime
    description: str
    metadata: dict = None

@dataclass
class Badge:
    badge_id: str
    name: str
    description: str
    icon_url: str
    points_required: int
    category: str
    unlock_condition: str

@dataclass
class UserBadge:
    user_id: str
    badge_id: str
    earned_date: datetime
    progress_percentage: int = 100

class GamificationDB:
    def __init__(self, db_path=DATABASE_PATH):
        self.db_path = db_path
        self.init_database()
        self.seed_badges()
    
    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                total_points INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                streak_days INTEGER DEFAULT 0,
                last_active DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Point transactions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS point_transactions (
                transaction_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                points_earned INTEGER NOT NULL,
                activity_type TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                metadata TEXT,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Badges table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS badges (
                badge_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon_url TEXT,
                points_required INTEGER DEFAULT 0,
                category TEXT DEFAULT 'achievement',
                unlock_condition TEXT
            )
        ''')
        
        # User badges table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_badges (
                user_id TEXT NOT NULL,
                badge_id TEXT NOT NULL,
                earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                progress_percentage INTEGER DEFAULT 100,
                PRIMARY KEY (user_id, badge_id),
                FOREIGN KEY (user_id) REFERENCES users (user_id),
                FOREIGN KEY (badge_id) REFERENCES badges (badge_id)
            )
        ''')
        
        # Leaderboard view
        cursor.execute('''
            CREATE VIEW IF NOT EXISTS leaderboard AS
            SELECT 
                u.user_id,
                u.username,
                u.total_points,
                u.level,
                u.streak_days,
                RANK() OVER (ORDER BY u.total_points DESC) as current_rank
            FROM users u
            ORDER BY u.total_points DESC
        ''')
        
        conn.commit()
        conn.close()
    
    def seed_badges(self):
        """Seed initial badges"""
        badges = [
            Badge("first_quiz", "Quiz Rookie", "Complete your first quiz", "🎯", 0, "achievement", "quiz_completed >= 1"),
            Badge("quiz_master", "Quiz Master", "Complete 10 quizzes", "🏆", 150, "achievement", "quiz_completed >= 10"),
            Badge("streak_7", "Week Warrior", "7-day learning streak", "🔥", 100, "streak", "streak_days >= 7"),
            Badge("points_100", "Century Club", "Earn 100 points", "💯", 100, "points", "total_points >= 100"),
            Badge("points_500", "High Achiever", "Earn 500 points", "⭐", 500, "points", "total_points >= 500"),
            Badge("perfect_quiz", "Perfectionist", "Score 100% on a quiz", "🎯", 50, "achievement", "perfect_score >= 1"),
            Badge("social_learner", "Helper", "Help 5 peers", "🤝", 75, "social", "peers_helped >= 5"),
            Badge("content_creator", "Content Creator", "Upload 5 learning materials", "📚", 100, "social", "uploads >= 5"),
            Badge("early_bird", "Early Bird", "Complete morning learning sessions", "🌅", 25, "habit", "morning_sessions >= 5"),
            Badge("night_owl", "Night Owl", "Complete evening learning sessions", "🦉", 25, "habit", "evening_sessions >= 5")
        ]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for badge in badges:
            cursor.execute('''
                INSERT OR IGNORE INTO badges 
                (badge_id, name, description, icon_url, points_required, category, unlock_condition)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (badge.badge_id, badge.name, badge.description, badge.icon_url, 
                  badge.points_required, badge.category, badge.unlock_condition))
        
        conn.commit()
        conn.close()

    def create_or_update_user(self, user_id: str, username: str, email: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO users (user_id, username, email, last_active)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (user_id, username, email))
        
        conn.commit()
        conn.close()

    def award_points(self, user_id: str, points: int, activity_type: str, description: str, metadata: dict = None):
        import uuid
        transaction_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Add points transaction
        cursor.execute('''
            INSERT INTO point_transactions 
            (transaction_id, user_id, points_earned, activity_type, description, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (transaction_id, user_id, points, activity_type, description, 
              json.dumps(metadata) if metadata else None))
        
        # Update user total points
        cursor.execute('''
            UPDATE users 
            SET total_points = total_points + ?, 
                level = (total_points + ?) / 100 + 1,
                last_active = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ''', (points, points, user_id))
        
        conn.commit()
        conn.close()
        
        # Check for badge eligibility
        self._check_badge_eligibility(user_id)
        
        return transaction_id

    def _check_badge_eligibility(self, user_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get user stats
        cursor.execute('''
            SELECT total_points, 
                   (SELECT COUNT(*) FROM point_transactions WHERE user_id = ? AND activity_type = 'quiz_completed') as quiz_completed,
                   (SELECT COUNT(*) FROM point_transactions WHERE user_id = ? AND activity_type = 'perfect_quiz') as perfect_score,
                   streak_days
            FROM users WHERE user_id = ?
        ''', (user_id, user_id, user_id))
        
        user_stats = cursor.fetchone()
        if not user_stats:
            conn.close()
            return
        
        total_points, quiz_completed, perfect_score, streak_days = user_stats
        
        # Check each badge condition
        cursor.execute('SELECT badge_id, unlock_condition FROM badges')
        badges = cursor.fetchall()
        
        for badge_id, condition in badges:
            # Check if user already has this badge
            cursor.execute('SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?', 
                          (user_id, badge_id))
            if cursor.fetchone():
                continue
            
            # Evaluate condition
            try:
                if eval(condition):
                    cursor.execute('''
                        INSERT INTO user_badges (user_id, badge_id)
                        VALUES (?, ?)
                    ''', (user_id, badge_id))
            except:
                continue
        
        conn.commit()
        conn.close()

    def get_user_stats(self, user_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.*, 
                   (SELECT COUNT(*) FROM user_badges WHERE user_id = u.user_id) as badges_earned,
                   l.current_rank
            FROM users u
            LEFT JOIN leaderboard l ON u.user_id = l.user_id
            WHERE u.user_id = ?
        ''', (user_id,))
        
        result = cursor.fetchone()
        conn.close()
        return result

    def get_leaderboard(self, limit: int = 10):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT user_id, username, total_points, level, current_rank
            FROM leaderboard
            LIMIT ?
        ''', (limit,))
        
        results = cursor.fetchall()
        conn.close()
        return results

    def get_user_badges(self, user_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT b.badge_id, b.name, b.description, b.icon_url, ub.earned_date
            FROM badges b
            JOIN user_badges ub ON b.badge_id = ub.badge_id
            WHERE ub.user_id = ?
            ORDER BY ub.earned_date DESC
        ''', (user_id,))
        
        results = cursor.fetchall()
        conn.close()
        return results
