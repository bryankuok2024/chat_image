from flask import Flask, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_cors import CORS
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from googletrans import Translator, LANGUAGES
from PIL import Image, ImageDraw, ImageFont
import uuid
import wave
import numpy as np

# 載入環境變數
load_dotenv()

# 初始化 Flask 應用
app = Flask(__name__)
CORS(app)  # 啟用 CORS，允許前端跨域請求
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'

# 初始化資料庫同登錄管理器
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 初始化翻譯器
translator = Translator()

# 確保上載資料夾存在
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# 定義 User 模型（用戶資料表）
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    trial_start = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    daily_uses = db.Column(db.Integer, default=20)
    last_use_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    subscribed = db.Column(db.Boolean, default=False)

    def get_id(self):
        return str(self.id)

# 定義 Link 模型（動態連結資料表）
class Link(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    url = db.Column(db.String(200), nullable=False)

# 定義 TranslationCache 模型（翻譯緩存資料表）
class TranslationCache(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500), nullable=False)
    target_lang = db.Column(db.String(10), nullable=False)
    translated_text = db.Column(db.String(500), nullable=False)

    __table_args__ = (db.UniqueConstraint('text', 'target_lang', name='unique_translation'),)

# 定義 GeneratedContent 模型（儲存生成內容）
class GeneratedContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    media_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    file_path = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

# 用戶載入函數（用於 Flask-Login）
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# 註冊 API
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'User already exists'}), 400
    user = User(email=email)
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return jsonify({'message': 'Registered successfully'})

# 登入 API
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    login_user(user)
    return jsonify({'message': 'Logged in successfully'})

# 登出 API
@app.route('/api/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

# 獲取試用次數 API（未登入用戶）
@app.route('/api/trial', methods=['GET'])
def trial():
    ip = request.remote_addr
    if 'trial_count' not in session:
        session['trial_count'] = 5
        session['ip'] = ip
    if session['ip'] != ip:
        return jsonify({'message': 'IP changed, trial reset'}), 403
    return jsonify({'trial_count': session['trial_count']})

# 使用次數 API（處理試用或每日次數）
@app.route('/api/use', methods=['POST'])
def use():
    if not current_user.is_authenticated:
        ip = request.remote_addr
        if 'trial_count' not in session:
            session['trial_count'] = 5
            session['ip'] = ip
        if session['ip'] != ip:
            return jsonify({'message': 'IP changed, trial reset'}), 403
        if session['trial_count'] <= 0:
            return jsonify({'message': 'Trial limit reached, please register'}), 403
        session['trial_count'] -= 1
        return jsonify({'message': 'Trial use successful', 'trial_count': session['trial_count']})
    else:
        user = current_user
        today = datetime.utcnow().date()
        if user.last_use_date.date() != today:
            user.daily_uses = 20
            user.last_use_date = datetime.utcnow()
        if (datetime.utcnow() - user.trial_start).days > 30 and not user.subscribed:
            return jsonify({'message': 'Trial period expired, please subscribe'}), 403
        if user.daily_uses <= 0:
            return jsonify({'message': 'Daily limit reached'}), 403
        user.daily_uses -= 1
        db.session.commit()
        return jsonify({'message': 'Use successful', 'daily_uses': user.daily_uses})

# 獲取 logo API
@app.route('/api/logo', methods=['GET'])
def get_logo():
    logo_path = os.path.join(app.config['UPLOAD_FOLDER'], 'logo.png')
    if os.path.exists(logo_path):
        return jsonify({'logoUrl': f'http://localhost:5000/uploads/logo.png'})
    return jsonify({'logoUrl': ''})

# 上載 logo API（僅限管理員）
@app.route('/api/upload_logo', methods=['POST'])
@login_required
def upload_logo():
    if current_user.email != 'admin@example.com':
        return jsonify({'message': 'Unauthorized'}), 403
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    if file:
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], 'logo.png'))
        return jsonify({'message': 'Logo uploaded successfully', 'logoUrl': f'http://localhost:5000/uploads/logo.png'})

# 提供上載文件嘅靜態路由
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 獲取動態連結 API
@app.route('/api/links', methods=['GET'])
def get_links():
    links = Link.query.all()
    return jsonify({'links': [{'name': link.name, 'url': link.url} for link in links]})

# 新增動態連結 API（僅限管理員）
@app.route('/api/links', methods=['POST'])
@login_required
def add_link():
    if current_user.email != 'admin@example.com':
        return jsonify({'message': 'Unauthorized'}), 403
    data = request.get_json()
    name = data.get('name')
    url = data.get('url')
    if not name or not url:
        return jsonify({'message': 'Name and URL are required'}), 400
    link = Link(name=name, url=url)
    db.session.add(link)
    db.session.commit()
    return jsonify({'message': 'Link added successfully', 'link': {'name': name, 'url': url}})

# 刪除動態連結 API（僅限管理員）
@app.route('/api/links/<int:link_id>', methods=['DELETE'])
@login_required
def delete_link(link_id):
    if current_user.email != 'admin@example.com':
        return jsonify({'message': 'Unauthorized'}), 403
    link = Link.query.get(link_id)
    if not link:
        return jsonify({'message': 'Link not found'}), 404
    db.session.delete(link)
    db.session.commit()
    return jsonify({'message': 'Link deleted successfully'})

# 翻譯 API（加入緩存）
@app.route('/api/translate', methods=['POST'])
def translate_text():
    data = request.get_json()
    text = data.get('text')
    target_lang = data.get('targetLang')
    if not text or not target_lang:
        return jsonify({'message': 'Text and target language are required'}), 400

    # 檢查緩存
    cached_translation = TranslationCache.query.filter_by(text=text, target_lang=target_lang).first()
    if cached_translation:
        return jsonify({'translatedText': cached_translation.translated_text})

    # 如果無緩存，調用 Google Translate
    try:
        translated = translator.translate(text, dest=target_lang)
        # 儲存到緩存
        new_translation = TranslationCache(text=text, target_lang=target_lang, translated_text=translated.text)
        db.session.add(new_translation)
        db.session.commit()
        return jsonify({'translatedText': translated.text})
    except Exception as e:
        return jsonify({'message': f'Translation failed: {str(e)}'}), 500

# 調整多媒體 API（預覽版本，帶水印/雜訊）
@app.route('/api/adjust', methods=['POST'])
def adjust():
    data = request.get_json()
    media_type = data.get('media_type')
    description = data.get('description')

    if not media_type or not description:
        return jsonify({'message': 'Media type and description are required'}), 400

    if media_type == 'image':
        try:
            # 創建簡單圖片
            img = Image.new('RGB', (400, 300), color='lightblue')
            draw = ImageDraw.Draw(img)
            draw.text((10, 10), f"Generated Image: {description}", fill='black')
            # 加水印
            font = ImageFont.load_default()
            draw.text((150, 150), "Preview", fill='red', font=font)

            # 儲存預覽圖片
            preview_filename = f"{uuid.uuid4()}_preview.png"
            preview_path = os.path.join(app.config['UPLOAD_FOLDER'], preview_filename)
            img.save(preview_path)

            return jsonify({'file_url': f'http://localhost:5000/uploads/{preview_filename}'})
        except Exception as e:
            return jsonify({'message': f'Adjustment failed: {str(e)}'}), 500
    elif media_type == 'music':
        try:
            sample_rate = 44100
            duration = 10
            t = np.linspace(0, duration, sample_rate * duration, False)
            audio_data = np.sin(2 * np.pi * 440 * t) * 32767  # 440Hz 正弦波
            # 加入 Beep 雜訊（每 3 秒）
            for i in range(3, duration, 3):
                start_idx = int(i * sample_rate)
                end_idx = start_idx + int(sample_rate * 0.1)  # 0.1秒 Beep
                audio_data[start_idx:end_idx] = np.sin(2 * np.pi * 1000 * t[start_idx:end_idx]) * 32767 * 0.5
            audio_data = audio_data.astype(np.int16)

            # 儲存預覽音頻
            preview_filename = f"{uuid.uuid4()}_preview.wav"
            preview_path = os.path.join(app.config['UPLOAD_FOLDER'], preview_filename)
            with wave.open(preview_path, 'w') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())

            return jsonify({'file_url': f'http://localhost:5000/uploads/{preview_filename}'})
        except Exception as e:
            return jsonify({'message': f'Adjustment failed: {str(e)}'}), 500
    else:
        return jsonify({'message': f'Unsupported media type: {media_type}'}), 400

# 生成最終多媒體 API（無水印/雜訊，支援尺寸同格式）
@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json()
    media_type = data.get('media_type')
    description = data.get('description')
    size = data.get('size', '400x300')  # 預設尺寸
    format = data.get('format', 'png')  # 預設格式

    if not media_type or not description:
        return jsonify({'message': 'Media type and description are required'}), 400

    width, height = map(int, size.split('x'))
    if media_type == 'image':
        try:
            # 創建最終圖片（無水印）
            img = Image.new('RGB', (width, height), color='lightblue')
            draw = ImageDraw.Draw(img)
            draw.text((10, 10), f"Generated Image: {description}", fill='black')

            # 儲存最終圖片
            filename = f"{uuid.uuid4()}.{format}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            img.save(file_path, format.upper())

            # 儲存生成記錄（計一次使用）
            content = GeneratedContent(
                user_id=current_user.id if current_user.is_authenticated else None,
                media_type=media_type,
                description=description,
                file_path=filename
            )
            db.session.add(content)
            db.session.commit()

            # 扣減使用次數
            response = use()
            if response.status_code != 200:
                return response

            return jsonify({'file_url': f'http://localhost:5000/uploads/{filename}'})
        except Exception as e:
            return jsonify({'message': f'Generation failed: {str(e)}'}), 500
    elif media_type == 'music':
        try:
            # 創建最終音頻（無 Beep 雜訊）
            sample_rate = 44100
            duration = 10
            t = np.linspace(0, duration, sample_rate * duration, False)
            audio_data = np.sin(2 * np.pi * 440 * t) * 32767  # 440Hz 正弦波
            audio_data = audio_data.astype(np.int16)

            # 儲存最終音頻
            filename = f"{uuid.uuid4()}.{format if format in ['wav', 'mp3'] else 'wav'}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            with wave.open(file_path, 'w') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())

            # 儲存生成記錄（計一次使用）
            content = GeneratedContent(
                user_id=current_user.id if current_user.is_authenticated else None,
                media_type=media_type,
                description=description,
                file_path=filename
            )
            db.session.add(content)
            db.session.commit()

            # 扣減使用次數
            response = use()
            if response.status_code != 200:
                return response

            return jsonify({'file_url': f'http://localhost:5000/uploads/{filename}'})
        except Exception as e:
            return jsonify({'message': f'Generation failed: {str(e)}'}), 500
    else:
        return jsonify({'message': f'Unsupported media type: {media_type}'}), 400

# 我的作品 API
@app.route('/api/my-works', methods=['GET'])
@login_required
def my_works():
    works = GeneratedContent.query.filter_by(user_id=current_user.id).all()
    return jsonify({
        'works': [
            {
                'id': work.id,
                'media_type': work.media_type,
                'description': work.description,
                'file_url': f'http://localhost:5000/uploads/{work.file_path}'
            } for work in works
        ]
    })

# 共享作品 API
@app.route('/api/shared-works', methods=['GET'])
def shared_works():
    works = GeneratedContent.query.all()
    return jsonify({
        'works': [
            {
                'id': work.id,
                'media_type': work.media_type,
                'description': work.description,
                'file_url': f'http://localhost:5000/uploads/{work.file_path}'
            } for work in works
        ]
    })

# 啟動應用時初始化資料庫
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not Link.query.first():
            db.session.add(Link(name='community', url='/community'))
            db.session.add(Link(name='shared_works', url='/shared-works'))
            db.session.commit()
    app.run(debug=True)