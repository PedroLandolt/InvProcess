from services.database import init_db, seed_users


def seed():
    init_db()
    seed_users()
    print("Database initialized — users seeded, ready for uploads")


if __name__ == "__main__":
    seed()
