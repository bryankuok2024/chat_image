# config.py

# Flask 設置
SECRET_KEY = 'your-secret-key'  # Flask 嘅密鑰

# 資料庫設置（MySQL）
MYSQL_USER = 'root'
MYSQL_PASSWORD = 'Yenoo5581'
MYSQL_HOST = 'localhost'
MYSQL_DB = 'ai_multimedia_db'
MYSQL_CHARSET = 'utf8mb4'

# 上傳資料夾
UPLOAD_FOLDER = 'uploads'

# 其他外掛設置（例如 API key）
DIALOGFLOW_API_KEY = 'your-dialogflow-api-key'  # Dialogflow API key
STABLE_DIFFUSION_API_KEY = 'your-stable-diffusion-api-key'  # Stable Diffusion API key（如果有）
JUKEBOX_API_KEY = 'your-jukebox-api-key'  # Jukebox API key（如果有）