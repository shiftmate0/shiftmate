from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:1111@localhost:3306/shiftmate"
    SECRET_KEY: str = "dev-secret-key"
    ADMIN_EMPLOYEE_NO: str = "ADMIN001"
    ADMIN_NAME: str = "Admin"
    ADMIN_PASSWORD: str = "admin1234!"

    class Config:
        env_file = ".env"


settings = Settings()
