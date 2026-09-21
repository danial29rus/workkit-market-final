from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = 'WorkKit Studio API'
    api_prefix: str = '/api'
    database_url: str = 'sqlite:///./workkit.db'
    frontend_origin: str = 'http://localhost:5173'
    admin_token: str = 'change-me-in-production'
    jwt_secret: str = 'change-this-long-random-secret-in-production'
    access_token_minutes: int = 720
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()
