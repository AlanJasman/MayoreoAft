import os
from dotenv import load_dotenv
from pydantic import BaseSettings

# Cargar variables de entorno
load_dotenv()

class Settings(BaseSettings):
    # Configuración de autenticación JWT
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "default-insecure-key-for-dev")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    
    # Configuración de Supabase (si necesitas accederla desde aquí)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Instancia singleton de configuración
settings = Settings()