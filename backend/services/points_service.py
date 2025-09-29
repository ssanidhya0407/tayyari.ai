from models.gamification import GamificationDB

class PointsService:
    def __init__(self):
        self.db = GamificationDB()
        self.point_values = {
            'quiz_completed': 15,
            'quiz_perfect': 25,
            'quiz_good': 20,    # 80%+ score
            'quiz_average': 10,  # 60-79% score
            'content_upload': 30,
            'daily_login': 5,
            'streak_bonus': 10,  # Additional points for maintaining streaks
            'first_time_bonus': 50,  # First quiz, first upload, etc.
            'help_peer': 15,
            'share_content': 10
        }
    
    def calculate_quiz_points(self, quiz_score: float, is_first_quiz: bool = False):
        """Calculate points based on quiz performance"""
        base_points = 0
        activity_type = 'quiz_completed'
        
        if quiz_score >= 1.0:  # 100%
            base_points = self.point_values['quiz_perfect']
            activity_type = 'perfect_quiz'
        elif quiz_score >= 0.8:  # 80%+
            base_points = self.point_values['quiz_good']
        elif quiz_score >= 0.6:  # 60%+
            base_points = self.point_values['quiz_average']
        else:
            base_points = self.point_values['quiz_completed']
        
        # First-time bonus
        if is_first_quiz:
            base_points += self.point_values['first_time_bonus']
            
        return base_points, activity_type
    
    def award_quiz_points(self, user_id: str, quiz_score: float, quiz_data: dict):
        """Award points for quiz completion"""
        # Check if this is user's first quiz
        user_stats = self.db.get_user_stats(user_id)
        is_first_quiz = user_stats is None or user_stats[1] == 0  # Assuming quiz count is at index 1
        
        points, activity_type = self.calculate_quiz_points(quiz_score, is_first_quiz)
        
        description = f"Quiz completed with {int(quiz_score * 100)}% score"
        if is_first_quiz:
            description += " (First Quiz Bonus!)"
            
        metadata = {
            'quiz_score': quiz_score,
            'quiz_topic': quiz_data.get('topic', 'Unknown'),
            'is_first_quiz': is_first_quiz
        }
        
        transaction_id = self.db.award_points(
            user_id=user_id,
            points=points,
            activity_type=activity_type,
            description=description,
            metadata=metadata
        )
        
        return {
            'points_earned': points,
            'transaction_id': transaction_id,
            'activity_type': activity_type,
            'is_first_quiz': is_first_quiz
        }
    
    def award_content_upload_points(self, user_id: str, content_type: str, content_name: str):
        """Award points for uploading learning content"""
        points = self.point_values['content_upload']
        
        metadata = {
            'content_type': content_type,
            'content_name': content_name
        }
        
        transaction_id = self.db.award_points(
            user_id=user_id,
            points=points,
            activity_type='content_upload',
            description=f"Uploaded {content_type}: {content_name}",
            metadata=metadata
        )
        
        return {
            'points_earned': points,
            'transaction_id': transaction_id
        }
    
    def award_daily_login_points(self, user_id: str):
        """Award points for daily login"""
        points = self.point_values['daily_login']
        
        transaction_id = self.db.award_points(
            user_id=user_id,
            points=points,
            activity_type='daily_login',
            description="Daily login bonus"
        )
        
        return {
            'points_earned': points,
            'transaction_id': transaction_id
        }
