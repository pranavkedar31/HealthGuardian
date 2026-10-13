from getpass import getpass

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


def main():
    email = input("Admin email: ").strip().lower()
    full_name = input("Admin full name: ").strip()
    password = getpass("Admin password: ")

    db = SessionLocal()

    try:
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            print("A user with this email already exists.")
            print(f"Current role: {existing_user.role}")

            choice = input("Make this user an admin? (yes/no): ").strip().lower()

            if choice == "yes":
                existing_user.role = UserRole.admin
                existing_user.is_active = True
                existing_user.is_verified = True
                db.commit()

                print("User has been promoted to admin.")
            else:
                print("No changes made.")

            return

        admin = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.admin,
            is_active=True,
            is_verified=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("Admin account created successfully.")
        print(f"Email: {admin.email}")
        print(f"Role: {admin.role}")

    finally:
        db.close()


if __name__ == "__main__":
    main()