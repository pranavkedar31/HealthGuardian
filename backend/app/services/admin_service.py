from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository


class AdminService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    def list_users(self, skip: int = 0, limit: int = 100):
        return self.user_repo.list(skip, limit)

    def list_doctors(self, skip: int = 0, limit: int = 100):
        users = self.user_repo.list(skip, limit)

        return [
            user
            for user in users
            if str(user.role).lower().endswith("doctor")
        ]

    def activate_user(self, user_id):
        user = self.user_repo.get(user_id)

        if user:
            return self.user_repo.update(
                user,
                {"is_active": True}
            )

        return None

    def deactivate_user(self, user_id):
        user = self.user_repo.get(user_id)

        if user:
            return self.user_repo.update(
                user,
                {"is_active": False}
            )

        return None

    def get_statistics(self):
        users = self.user_repo.list(skip=0, limit=10000)

        total_users = len(users)

        doctors = [
            user
            for user in users
            if str(user.role).lower().endswith("doctor")
        ]

        active_users = [
            user
            for user in users
            if user.is_active
        ]

        inactive_users = [
            user
            for user in users
            if not user.is_active
        ]

        return {
            "total_users": total_users,
            "total_doctors": len(doctors),
            "active_users": len(active_users),
            "inactive_users": len(inactive_users),
        }
