# config.example.py
"""
Пример конфигурационного файла для продакшена.
Скопируйте этот файл в config.py и заполните реальными значениями.
"""

# ---------------------------------------------------------
# Telegram Bot settings (опционально)
# ---------------------------------------------------------
BOT_TOKEN = "your_telegram_bot_token_here"
ADMIN_ID = 0  # ID администратора в Telegram

# ---------------------------------------------------------
# API keys (обязательно заполнить)
# ---------------------------------------------------------
SERPER_API_KEY = "your_serper_api_key_here"
OPENAI_API_KEY = "sk-your-openai-api-key-here"
MPSTATS_API_KEY = "your_mpstats_api_key_here"
YOUTUBE_API_KEY = "your_youtube_api_key_here"
VK_SERVICE_KEY = "your_vk_service_key_here"  # Опционально

# ---------------------------------------------------------
# Server settings
# ---------------------------------------------------------
HOST = "0.0.0.0"
PORT = 8000
DEBUG = False

# ---------------------------------------------------------
# Database settings
# ---------------------------------------------------------
DATABASE_URL = "sqlite:///./wild_analytics.db"

# ---------------------------------------------------------
# Security settings
# ---------------------------------------------------------
SECRET_KEY = "your-secret-key-here"
JWT_SECRET_KEY = "your-jwt-secret-key-here"

# ---------------------------------------------------------
# CORS settings
# ---------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://your-domain.com",
    "http://your-server-ip"
] 