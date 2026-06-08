from database import SessionLocal, engine
from models import Base, Category, User, UserRole
from auth import get_password_hash

DEFAULT_CATEGORIES = ["PDV", "Cenografia", "Letreiro", "Display", "Fachada", "Totem"]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default gerente user
        if not db.query(User).filter(User.email == "admin@geka.com").first():
            admin = User(
                nome="Administrador GEKA",
                email="admin@geka.com",
                hashed_password=get_password_hash("geka2024"),
                role=UserRole.GERENTE,
            )
            db.add(admin)
            db.commit()
            print("Usuário admin criado: admin@geka.com / geka2024")

        # Seed default categories
        for cat_name in DEFAULT_CATEGORIES:
            if not db.query(Category).filter(Category.nome == cat_name).first():
                db.add(Category(nome=cat_name, fields_schema={}))
        db.commit()
        print(f"Categorias padrão verificadas: {DEFAULT_CATEGORIES}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
