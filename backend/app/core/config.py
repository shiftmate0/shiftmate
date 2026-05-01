from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ADMIN_EMPLOYEE_NO: str
    ADMIN_NAME: str
    ADMIN_PASSWORD: str
    DEMO_MODE: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
