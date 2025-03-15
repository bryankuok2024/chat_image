from flask import Flask, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_cors import CORS
from datetime import datetime
import os
from PIL import Image, ImageDraw, ImageFont
import uuid
import wave
import numpy as np

# 引入 config 文件
from config import *

# 初始化 Flask 應用
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = SECRET_KEY
# 使用 MySQL 資料庫 URI
app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}?charset={MYSQL_CHARSET}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 初始化資料庫和登入管理器
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 確保上傳資料夾存在
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# 用戶模型
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    trial_start = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    daily_uses = db.Column(db.Integer, default=20)
    last_use_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    subscribed = db.Column(db.Boolean, default=False)

    def get_id(self):
        return str(self.id)

# 生成內容模型
class GeneratedContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    media_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    file_path = db.Column(db.String(200), nullable=False)
    is_final = db.Column(db.Boolean, default=False)  # 是否為最終版本
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

# 用戶載入器
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# 註冊 API
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    if User.query.filter_by(email=email).first():
        return jsonify({'message': '用戶已存在'}), 400
    user = User(email=email)
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return jsonify({'message': '註冊成功'})

# 登入 API
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': '用戶不存在'}), 404
    login_user(user)
    return jsonify({'message': '登入成功'})

# 登出 API
@app.route('/api/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': '登出成功'})

# 使用次數檢查 API
@app.route('/api/use', methods=['POST'])
def use():
    if not current_user.is_authenticated:
        if 'trial_count' not in session:
            session['trial_count'] = 5
        if session['trial_count'] <= 0:
            return jsonify({'message': '試用次數已用完，請註冊'}), 403
        session['trial_count'] -= 1
        return jsonify({'message': '試用成功', 'trial_count': session['trial_count']})
    else:
        user = current_user
        today = datetime.utcnow().date()
        if user.last_use_date.date() != today:
            user.daily_uses = 20
            user.last_use_date = datetime.utcnow()
        if user.daily_uses <= 0:
            return jsonify({'message': '今日使用次數已用完'}), 403
        user.daily_uses -= 1
        db.session.commit()
        return jsonify({'message': '使用成功', 'daily_uses': user.daily_uses})

# 調整 API（生成預覽）
@app.route('/api/adjust', methods=['POST'])
def adjust():
    data = request.get_json()
    media_type = data.get('media_type')
    description = data.get('description')

    if not media_type or not description:
        return jsonify({'message': '需要多媒體類型和描述'}), 400

    if media_type == 'image':
        img = Image.new('RGB', (400, 300), color='lightblue')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), f"生成圖片: {description}", fill='black')
        draw.text((150, 150), "預覽", fill='red')  # 添加水印
        preview_filename = f"{uuid.uuid4()}_preview.png"
        preview_path = os.path.join(app.config['UPLOAD_FOLDER'], preview_filename)
        img.save(preview_path)

        content = GeneratedContent(
            user_id=current_user.id if current_user.is_authenticated else None,
            media_type=media_type,
            description=description,
            file_path=preview_filename,
            is_final=False
        )
        db.session.add(content)
        db.session.commit()

        return jsonify({'file_url': f'http://localhost:5000/uploads/{preview_filename}'})

    elif media_type == 'music':
        sample_rate = 44100
        duration = 10
        t = np.linspace(0, duration, sample_rate * duration, False)
        audio_data = np.sin(2 * np.pi * 440 * t) * 32767
        for i in range(3, duration, 3):  # 每 3 秒添加提示音
            start_idx = int(i * sample_rate)
            end_idx = start_idx + int(sample_rate * 0.1)
            audio_data[start_idx:end_idx] = np.sin(2 * np.pi * 1000 * t[start_idx:end_idx]) * 32767 * 0.5
        audio_data = audio_data.astype(np.int16)

        preview_filename = f"{uuid.uuid4()}_preview.wav"
        preview_path = os.path.join(app.config['UPLOAD_FOLDER'], preview_filename)
        with wave.open(preview_path, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data.tobytes())

        content = GeneratedContent(
            user_id=current_user.id if current_user.is_authenticated else None,
            media_type=media_type,
            description=description,
            file_path=preview_filename,
            is_final=False
        )
        db.session.add(content)
        db.session.commit()

        return jsonify({'file_url': f'http://localhost:5000/uploads/{preview_filename}'})

# 生成 API（最終版本）
@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json()
    media_type = data.get('media_type')
    description = data.get('description')

    if not current_user.is_authenticated:
        return jsonify({'message': '請登入以生成最終內容'}), 403

    user_folder = os.path.join('works', str(current_user.id), media_type)
    if not os.path.exists(user_folder):
        os.makedirs(user_folder)

    if media_type == 'image':
        img = Image.new('RGB', (400, 300), color='lightblue')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), f"生成圖片: {description}", fill='black')  # 無水印
        filename = f"{uuid.uuid4()}.png"
        file_path = os.path.join(user_folder, filename)
        img.save(file_path)

        content = GeneratedContent(
            user_id=current_user.id,
            media_type=media_type,
            description=description,
            file_path=file_path,
            is_final=True
        )
        db.session.add(content)
        db.session.commit()

        return jsonify({'file_url': f'http://localhost:5000/{file_path}'})

    elif media_type == 'music':
        sample_rate = 44100
        duration = 10
        t = np.linspace(0, duration, sample_rate * duration, False)
        audio_data = np.sin(2 * np.pi * 440 * t) * 32767  # 無提示音
        audio_data = audio_data.astype(np.int16)

        filename = f"{uuid.uuid4()}.wav"
        file_path = os.path.join(user_folder, filename)
        with wave.open(file_path, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data.tobytes())

        content = GeneratedContent(
            user_id=current_user.id,
            media_type=media_type,
            description=description,
            file_path=file_path,
            is_final=True
        )
        db.session.add(content)
        db.session.commit()

        return jsonify({'file_url': f'http://localhost:5000/{file_path}'})

# 我的作品 API
@app.route('/api/my-works', methods=['GET'])
@login_required
def my_works():
    works = GeneratedContent.query.filter_by(user_id=current_user.id, is_final=True).all()
    return jsonify({
        'works': [
            {
                'id': work.id,
                'media_type': work.media_type,
                'description': work.description,
                'file_url': f'http://localhost:5000/{work.file_path}'
            } for work in works
        ]
    })

# 提供上傳文件
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 提供作品文件
@app.route('/works/<path:filename>')
def works_file(filename):
    return send_from_directory('works', filename)

# 初始化資料庫並啟動應用
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)