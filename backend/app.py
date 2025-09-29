import os
import json
import requests
from dotenv import load_dotenv
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from werkzeug.utils import secure_filename
import kokoro
from kokoro import KPipeline
import soundfile as sf
import numpy as np
import re
import pdfplumber
import torch
import io
from typing import List
# from agents import AgentService, SafetyStatus  # Temporarily disabled
import time
from datetime import datetime, timedelta
from openai import OpenAI
# import whisper  # Temporarily disabled to avoid dependency issues
from models.gamification import GamificationDB
from services.points_service import PointsService
import sqlite3
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
import os
from werkzeug.utils import secure_filename

gamification_db = GamificationDB()
points_service = PointsService()

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
github_token = os.getenv("GITHUB_TOKEN")

pipeline = KPipeline(lang_code='a')

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:3001"], "methods": ["GET", "POST"], "allow_headers": ["Content-Type"]}})

client = OpenAI(
    base_url="https://models.github.ai/inference",
    api_key=github_token,
) if github_token else None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class RateLimitedGeminiAPI:
    def __init__(self, api_key, model="gemini-1.5-pro-latest"):
        self.api_key = api_key
        self.last_request_time = None
        self.min_interval = 1
        self.retry_attempts = 2
        self.base_delay = 0.5
        self.model = model
        
    def call_gemini_api(self, prompt, model_override=None):
        if not self.api_key:
            return None
        if not self.api_key.startswith('AIzaSy'):
            return None
        if self.last_request_time:
            time_since_last = time.time() - self.last_request_time
            if time_since_last < self.min_interval:
                sleep_time = self.min_interval - time_since_last
                time.sleep(sleep_time)
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_override or self.model}:generateContent?key={self.api_key}"
        )
        headers = {"Content-Type": "application/json"}
        data = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        for attempt in range(self.retry_attempts):
            try:
                self.last_request_time = time.time()
                response = requests.post(url, headers=headers, json=data, timeout=15)
                if response.status_code == 200:
                    return response.json()["candidates"][0]["content"]["parts"][0]["text"]
                elif response.status_code == 429:
                    if attempt < self.retry_attempts - 1:
                        time.sleep(self.base_delay * (2 ** attempt))
                        continue
                    else:
                        return None
                else:
                    response.raise_for_status()
            except Exception:
                if attempt < self.retry_attempts - 1:
                    time.sleep(self.base_delay * (2 ** attempt))
                    continue
                return None
        return None

gemini_api = RateLimitedGeminiAPI(GEMINI_API_KEY, model="gemini-1.5-pro-latest")
gemini_flash_api = RateLimitedGeminiAPI(GEMINI_API_KEY, model="gemini-1.5-flash")

def call_gemini_api(prompt, use_github_api=True, model_override=None):
    if use_github_api and client and github_token:
        try:
            response = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful AI assistant that creates educational content and answers questions. Always include at least one diagram or visual explanation in the output.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="openai/gpt-4o",
                temperature=0.8,
                max_tokens=1800,
                top_p=1
            )
            return response.choices[0].message.content
        except Exception:
            pass
    api = gemini_flash_api if model_override == "flash" else gemini_api
    return api.call_gemini_api(prompt, model_override="gemini-1.5-flash" if model_override == "flash" else None)

def build_prompt_with_heading_and_diagram(title, content, icon="📘"):
    return (
        f"## {icon} {title}\n"
        "Please answer in the following format:\n"
        "- Start with a large, bold markdown heading (##) and a relevant icon for the topic.\n"
        "- Add a diagram (as a Markdown image, ASCII, or a creative visual analogy) and provide a caption. If you can't generate an image, use ASCII or a creative analogy in markdown.\n"
        "- Structure your explanation as concise bullet points (not paragraphs).\n"
        "- Always include the diagram and the points, even if you must invent a visual analogy.\n\n"
        f"Content to answer: {content}\n"
    )

def process_with_gemini(text, use_github_api=True):
    summary_title = "AI Answer"
    prompt = build_prompt_with_heading_and_diagram(summary_title, text, "📘")
    result = call_gemini_api(prompt, use_github_api=use_github_api, model_override="flash")
    if result is None:
        result = gemini_flash_api.call_gemini_api(prompt, model_override="gemini-1.5-flash")
    
    # Fallback response when API keys are not configured
    if result is None:
        return f"""## 📘 {summary_title}

**Demo Mode - API Keys Not Configured**

Here's a sample educational response about: "{text[:100]}..."

### Key Concepts:
• This is a demonstration of the learning platform
• In full mode, this would use AI to provide detailed explanations
• The system supports interactive quizzes and visual diagrams
• Configure GEMINI_API_KEY or GITHUB_TOKEN to enable full AI features

### Learning Path:
1. **Understand the Basics** - Start with fundamental concepts
2. **Practice** - Use interactive exercises and quizzes  
3. **Apply** - Work on real-world examples
4. **Review** - Test your knowledge with assessments

*Note: Configure your API keys in the backend/.env file to unlock full AI-powered responses.*"""
    
    return result

def generate_quiz_with_gemini(text, use_github_api=True):
    """Generate quiz questions based on the provided text using Gemini AI"""
    quiz_prompt = f"""You are an expert educational quiz generator. Based on the following content, create a comprehensive quiz with explanations and visual diagrams.

Content to create quiz from: {text}

Please generate exactly 3-5 multiple choice questions about this content. Follow this EXACT JSON-like format:

**QUIZ START**

**Question 1:** What is the main concept being discussed in this content?
A) Option A text here
B) Option B text here  
C) Option C text here
D) Option D text here
**Correct Answer:** B
**Explanation:** Detailed explanation of why B is correct and others are wrong. Include key concepts and learning points.
**Diagram:** flowchart TD
    A[Main Concept] --> B[Key Feature 1]
    A --> C[Key Feature 2]
    B --> D[Application 1]
    C --> E[Application 2]

**Question 2:** [Next question following same format...]

**QUIZ END**

Important guidelines:
- Questions should test understanding, not just memorization
- Make all 4 options plausible but only one clearly correct
- Explanations should be educational and comprehensive (2-3 sentences)
- Include mermaid flowchart diagrams that visualize the concept being tested
- Diagrams should be simple but informative (flowchart, graph, or concept map)
- Focus on the most important aspects of the content
- Vary question difficulty from basic to application level"""

    result = call_gemini_api(quiz_prompt, use_github_api=use_github_api, model_override="flash")
    if result is None:
        result = gemini_flash_api.call_gemini_api(quiz_prompt, model_override="gemini-1.5-flash")
    
    # Clean up the response format
    if result:
        # Remove markdown code blocks around diagrams
        result = result.replace('```mermaid\n', '').replace('\n```', '')
        # Remove extra dashes/separators
        result = result.replace('\n---\n', '\n\n')
    
    # Fallback quiz when API keys are not configured
    if result is None:
        return f"""**QUIZ START**

**Question 1:** Based on the content about "{text[:50]}...", what is the main concept being discussed?
A) A technical process that requires advanced knowledge
B) A fundamental principle that can be applied broadly  
C) A specific tool used only in certain situations
D) An outdated method no longer in use
**Correct Answer:** B
**Explanation:** The content discusses fundamental principles that have broad applications across multiple domains. Understanding these core concepts is essential for building expertise in the field.
**Diagram:** flowchart TD
    A[Main Concept] --> B[Core Principles]
    A --> C[Applications]
    B --> D[Theory]
    B --> E[Practice]
    C --> F[Real World Use]

**Question 2:** Which approach would be most effective for learning this topic?
A) Memorizing all the details without understanding
B) Focusing only on practical applications
C) Understanding the underlying principles first
D) Skipping the basics and jumping to advanced concepts
**Correct Answer:** C
**Explanation:** Effective learning requires understanding fundamental principles before moving to applications. This creates a solid foundation that supports advanced learning and practical implementation.
**Diagram:** flowchart TD
    A[Learning Process] --> B[Understand Principles]
    B --> C[Study Examples]
    C --> D[Practice Application]
    D --> E[Master Advanced Topics]

**QUIZ END**

*Note: These are sample questions. Configure your API keys to get AI-generated quizzes tailored to your specific content.*"""
    
    return result

chat_history = []
vector_store = None
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000"], "methods": ["GET", "POST"], "allow_headers": ["Content-Type"]}})
# agent_service = AgentService(api_key=GEMINI_API_KEY)  # Temporarily disabled


# Initialize gamification database
def init_gamification_db():
    """Initialize the gamification database - this creates the .db file automatically"""
    db_path = os.path.join(os.path.dirname(__file__), 'gamification.db')
    
    print(f"🗄️ Creating database at: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            total_points INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            streak_days INTEGER DEFAULT 0,
            last_active DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Point transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS point_transactions (
            transaction_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            points_earned INTEGER NOT NULL,
            activity_type TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            description TEXT,
            metadata TEXT,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
    ''')
    
    # Badges table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS badges (
            badge_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            icon_url TEXT,
            points_required INTEGER DEFAULT 0,
            category TEXT DEFAULT 'achievement',
            unlock_condition TEXT
        )
    ''')
    
    # User badges table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_badges (
            user_id TEXT NOT NULL,
            badge_id TEXT NOT NULL,
            earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            progress_percentage INTEGER DEFAULT 100,
            PRIMARY KEY (user_id, badge_id),
            FOREIGN KEY (user_id) REFERENCES users (user_id),
            FOREIGN KEY (badge_id) REFERENCES badges (badge_id)
        )
    ''')
    
    # Seed initial badges
    badges = [
        ("first_quiz", "Quiz Rookie", "Complete your first quiz", "🎯", 0, "achievement"),
        ("quiz_master", "Quiz Master", "Complete 10 quizzes", "🏆", 150, "achievement"),
        ("streak_7", "Week Warrior", "7-day learning streak", "🔥", 100, "streak"),
        ("points_100", "Century Club", "Earn 100 points", "💯", 100, "points"),
        ("points_500", "High Achiever", "Earn 500 points", "⭐", 500, "points"),
        ("perfect_quiz", "Perfectionist", "Score 100% on a quiz", "🎯", 50, "achievement"),
        ("social_learner", "Helper", "Help 5 peers", "🤝", 75, "social"),
        ("content_creator", "Content Creator", "Upload 5 learning materials", "📚", 100, "social"),
    ]
    
    for badge in badges:
        cursor.execute('''
            INSERT OR IGNORE INTO badges 
            (badge_id, name, description, icon_url, points_required, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', badge)
    
    conn.commit()
    conn.close()
    
    print("✅ Gamification database initialized successfully!")
    return db_path
def get_db_path():
    """Get the database path"""
    return os.path.join(os.path.dirname(__file__), 'gamification.db')

# Points calculation functions
def calculate_quiz_points(quiz_score):
    """Calculate points based on quiz performance"""
    if quiz_score >= 1.0:  # 100%
        return 25, "perfect_quiz"
    elif quiz_score >= 0.8:  # 80%+
        return 20, "quiz_completed"
    elif quiz_score >= 0.6:  # 60%+
        return 15, "quiz_completed"
    else:
        return 10, "quiz_completed"

def award_points(user_id, points, activity_type, description):
    """Award points to user and update their total"""
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    
    transaction_id = str(uuid.uuid4())
    
    # Add points transaction
    cursor.execute('''
        INSERT INTO point_transactions 
        (transaction_id, user_id, points_earned, activity_type, description, timestamp)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ''', (transaction_id, user_id, points, activity_type, description))
    
    # Update or create user record
    cursor.execute('''
        INSERT OR IGNORE INTO users (user_id, username, email, total_points, level)
        VALUES (?, 'Anonymous', 'unknown@example.com', 0, 1)
    ''', (user_id,))
    
    # Update user total points and level
    cursor.execute('''
        UPDATE users 
        SET total_points = total_points + ?,
            level = (total_points + ?) / 100 + 1,
            last_active = CURRENT_TIMESTAMP
        WHERE user_id = ?
    ''', (points, points, user_id))
    
    conn.commit()
    conn.close()
    
    return transaction_id

# INITIALIZE THE DATABASE WHEN THE APP STARTS
print("🚀 Initializing Tayyari.ai backend...")
init_gamification_db()

DOWNLOADS_DIR = "downloads"
UPLOAD_FOLDER = "uploads"
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def download_file(file_url):
    try:
        if file_url.endswith('.pdf'):
            filename = file_url.split("/")[-1]
        else:
            filename = file_url.split("/")[-2] + ".pdf"
        local_filename = os.path.join(DOWNLOADS_DIR, filename)
        response = requests.get(file_url, stream=True, timeout=30)
        response.raise_for_status()
        with open(local_filename, "wb") as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)
        return local_filename
    except requests.exceptions.RequestException:
        return None
    except Exception:
        return None

def extract_text_from_pdf(pdf_path):
    try:
        try:
            loader = PyPDFLoader(pdf_path)
            pages = loader.load()
            text = "\n".join([page.page_content for page in pages if page.page_content])
            if text.strip():
                return text
        except Exception:
            pass
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                text_parts = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                if text_parts:
                    text = "\n".join(text_parts)
                    text = re.sub(r"(\w+)\s*\n\s*(\w+)", r"\1 \2", text)
                    return text
        except Exception:
            pass
        return ""
    except Exception:
        return ""

@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and file.filename.lower().endswith('.pdf'):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': filename,
                'fileUrl': f'/uploads/{filename}'
            }), 200
        
        return jsonify({'error': 'Invalid file type'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def split_text_for_rag(text):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    return text_splitter.split_text(text)

@app.route('/test-github-api', methods=['POST'])
def test_github_api():
    try:
        data = request.json
        prompt = data.get('prompt', 'What is the capital of France?')
        if not client:
            return jsonify({
                'error': 'GitHub API not configured. Please set GITHUB_TOKEN environment variable.'
            }), 400
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant.",
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-4o",
            temperature=1,
            max_tokens=4096,
            top_p=1
        )
        return jsonify({
            'response': response.choices[0].message.content,
            'status': 'success',
            'api_used': 'github_openai'
        })
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/process-interaction', methods=['POST'])
def process_interaction():
    try:
        data = request.json
        user_input = data.get('input')
        if not user_input:
            return jsonify({
                'error': 'No input provided'
            }), 400
        current_topic = data.get('current_topic')
        active_subtopic = data.get('active_subtopic')
        session_history = data.get('session_history')
        # response = agent_service.start_new_topic(user_input, current_topic=current_topic, active_subtopic=active_subtopic, session_history=session_history)  # Temporarily disabled
        response_dict = {"message": "Agent service temporarily disabled", "status": "success"}
        return jsonify(response_dict)
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

def generate_audio(text):
    generator = pipeline(
        text, voice='af_heart',
        speed=1
    )
    all_audio = []
    for i, (gs, ps, audio) in enumerate(generator):
        all_audio.append(audio)
    final_audio = np.concatenate(all_audio)
    return final_audio

@app.route("/process-text2speech", methods=["POST"])
def process_text2speech():
    text = ""
    if "pdf" in request.files:
        file = request.files["pdf"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        try:
            with pdfplumber.open(file_path) as pdf:
                text_parts = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                text = " ".join(text_parts)
            text = re.sub(r"(\w+)\s*\n\s*(\w+)", r"\1 \2", text)
            try:
                os.remove(file_path)
            except Exception:
                pass
        except Exception as e:
            try:
                os.remove(file_path)
            except:
                pass
            return jsonify({"error": f"Could not extract text from PDF: {str(e)}"}), 400
    else:
        text = request.form.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        audio = generate_audio(text)
        wav_file = io.BytesIO()
        sf.write(wav_file, audio, 24000, format='WAV')
        wav_file.seek(0)
        return send_file(wav_file, mimetype='audio/wav', as_attachment=False)
    except Exception as e:
        return jsonify({"error": f"Could not generate audio: {str(e)}"}), 500

def is_valid_pdf(file_url):
    try:
        if any(domain in file_url.lower() for domain in ['ucarecdn.com', 'drive.google.com', 'dropbox.com']):
            return True
        if file_url.lower().endswith('.pdf'):
            return True
        response = requests.head(file_url, timeout=10, allow_redirects=True)
        response.raise_for_status()
        content_type = response.headers.get('content-type', '').lower()
        if 'application/pdf' in content_type:
            return True
        response = requests.get(file_url, stream=True, timeout=10)
        response.raise_for_status()
        first_chunk = next(response.iter_content(chunk_size=4), b'')
        is_pdf = first_chunk.startswith(b'%PDF')
        return is_pdf
    except Exception:
        return True

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "MindFlow backend is running 🚀"})

@app.route('/process-content', methods=['POST'])
def process_content():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        notes = data.get('notes', '')
        files = data.get('files', [])
        mode = data.get('mode', 'learn')  # 'learn' or 'quiz'
        
        if not files and not notes.strip():
            return jsonify({
                'error': 'No files or notes provided. Please upload PDF files or add notes.',
                'debug_info': {
                    'received_files': files,
                    'received_notes_length': len(notes) if notes else 0
                }
            }), 400
        all_text = []
        if notes and notes.strip():
            all_text.append(notes.strip())
        if files and len(files) > 0:
            for i, file_url in enumerate(files):
                if not file_url or not file_url.strip():
                    continue
                file_url = file_url.strip()
                local_file = download_file(file_url)
                if not local_file:
                    return jsonify({
                        'error': f'Could not download file {i+1}. Please check the URL: {file_url}'
                    }), 400
                try:
                    text = extract_text_from_pdf(local_file)
                    if text and text.strip():
                        all_text.append(text.strip())
                except Exception as e:
                    return jsonify({
                        'error': f'Could not extract text from PDF {i+1}: {str(e)}'
                    }), 400
                finally:
                    try:
                        if local_file and os.path.exists(local_file):
                            os.remove(local_file)
                    except Exception:
                        pass
        if not all_text:
            return jsonify({
                'error': 'No content to process. Please provide PDF files with readable text or add notes.',
                'debug_info': {
                    'files_received': len(files),
                    'notes_length': len(notes) if notes else 0,
                    'text_extracted': len(all_text)
                }
            }), 400
        combined_text = "\n\n".join(all_text)
        
        # Choose processing method based on mode
        if mode == 'quiz':
            processed_content = generate_quiz_with_gemini(combined_text)
        else:
            processed_content = process_with_gemini(combined_text)
            
        if not processed_content:
            return jsonify({
                'error': 'AI processing failed. Please try again.'
            }), 503
        return jsonify({
            'response': processed_content,
            'status': 'success',
            'mode': mode,
            'debug_info': {
                'content_length': len(combined_text),
                'files_processed': len(files),
                'had_notes': bool(notes and notes.strip())
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Server error occurred',
            'technical_error': str(e)
        }), 500

@app.route("/get-summary", methods=["GET"])
def get_summary():
    # summary = agent_service.get_session_summary()  # Temporarily disabled
    # return jsonify(summary.to_dict())
    return jsonify({"message": "Summary feature temporarily disabled"})

# model = whisper.load_model("base")  # Temporarily disabled

@app.route('/speech2text', methods=['POST'])
def transcribe():
    temp_file = "temp_audio.wav"
    if 'file' in request.files:
        file = request.files['file']
        file.save(temp_file)
    elif request.data:
        with open(temp_file, "wb") as f:
            f.write(request.data)
    else:
        return jsonify({"error": "No audio data received"}), 400
    # result = model.transcribe(temp_file)  # Temporarily disabled
    # text = result["text"]
    text = "Speech transcription temporarily disabled"
    os.remove(temp_file)  
    return jsonify({"text": text})

@app.route('/explain-more', methods=['POST'])
def explain_more():
    try:
        data = request.json
        question = data.get('question')
        context = data.get('context', '')
        prompt = build_prompt_with_heading_and_diagram("More About This Topic", context, "🤔")
        response_text = call_gemini_api(prompt, model_override=None)
        if not response_text:
            return jsonify({'error': 'Failed to get response from AI APIs'}), 500
        return jsonify({'response': response_text, 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/interactive-questions', methods=['POST'])
def interactive_questions():
    try:
        data = request.json
        context = data.get('context', '')
        user_id = data.get('user_id')  # Add this line
        
        prompt = (
            "You are an educational quiz generator.\n"
            "Given the topic below, generate exactly 3 multiple-choice questions in this strict JSON format:\n"
            "[\n"
            " {\n"
            " \"question_text\": \"...\",\n"
            " \"options\": [\"...\", \"...\", \"...\", \"...\"],\n"
            " \"correct_answer\": \"...\",\n"
            " \"explanation\": \"...\",\n"
            " \"diagram\": \"(Provide a Markdown image, ASCII, or visual analogy for this question and explanation, and label it. Render as markdown string.)\"\n"
            " },\n"
            " ...\n"
            "]\n"
            "For each question, the explanation must:\n"
            "- Start with a big heading with an icon\n"
            "- Include the diagram (as markdown)\n"
            "- Then, give the explanation as bullet points (not a paragraph)\n"
            "Return only a JSON array of question objects. Do not add any extra text before or after the array.\n"
            f"Topic: {context}\n"
        )

        response_text = call_gemini_api(prompt, model_override="flash")

        try:
            questions = json.loads(response_text)
        except Exception:
            questions = [{
                "question_text": "Could not generate proper questions.",
                "options": ["Try again", "Contact support"],
                "correct_answer": "Try again",
                "explanation": "There was an error processing the content.",
                "diagram": ""
            }]

        # Award points for content upload if user_id provided
        if user_id:
            points_service.award_content_upload_points(
                user_id=user_id,
                content_type="Quiz Generation",
                content_name=context[:50] + "..." if len(context) > 50 else context
            )

        return jsonify({'questions': questions, 'status': 'success'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/user/initialize', methods=['POST'])
def initialize_user():
    """Initialize user in gamification system"""
    try:
        data = request.json
        user_id = data.get('user_id')
        username = data.get('username', 'Anonymous')
        email = data.get('email', 'unknown@example.com')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        
        # Create or update user
        cursor.execute('''
            INSERT OR REPLACE INTO users (user_id, username, email, last_active)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (user_id, username, email))
        
        conn.commit()
        conn.close()
        
        print(f"✅ User {username} ({user_id}) initialized")
        return jsonify({'status': 'success', 'message': 'User initialized'})
    except Exception as e:
        print(f"❌ Error initializing user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<user_id>/stats', methods=['GET'])
def get_user_stats(user_id):
    """Get user's gamification stats"""
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        
        # Get user stats
        cursor.execute('''
            SELECT user_id, username, email, total_points, level, streak_days,
                   (SELECT COUNT(*) FROM user_badges WHERE user_id = ?) as badges_earned
            FROM users WHERE user_id = ?
        ''', (user_id, user_id))
        
        user_data = cursor.fetchone()
        
        if not user_data:
            # Create user if doesn't exist
            cursor.execute('''
                INSERT INTO users (user_id, username, email) 
                VALUES (?, 'New User', 'user@example.com')
            ''', (user_id,))
            conn.commit()
            
            user_data = (user_id, 'New User', 'user@example.com', 0, 1, 0, 0)
        
        # Get user's rank
        cursor.execute('''
            SELECT COUNT(*) + 1 as rank
            FROM users
            WHERE total_points > (SELECT total_points FROM users WHERE user_id = ?)
        ''', (user_id,))
        rank_result = cursor.fetchone()
        rank = rank_result[0] if rank_result else 1
        
        conn.close()
        
        return jsonify({
            'user_stats': {
                'user_id': user_data[0],
                'username': user_data[1],
                'email': user_data[2],
                'total_points': user_data[3],
                'level': user_data[4],
                'streak_days': user_data[5],
                'badges_earned': user_data[6],
                'current_rank': rank
            }
        })
    except Exception as e:
        print(f"❌ Error getting user stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz_with_points():
    """Submit quiz and award points"""
    try:
        data = request.json
        user_id = data.get('user_id')
        quiz_score = data.get('score', 0.0)  # Score as decimal (0.0 to 1.0)
        quiz_data = data.get('quiz_data', {})
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        # Calculate points
        points, activity_type = calculate_quiz_points(quiz_score)
        
        # Check if this is user's first quiz
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        cursor.execute('''
            SELECT COUNT(*) FROM point_transactions 
            WHERE user_id = ? AND activity_type LIKE 'quiz%'
        ''', (user_id,))
        quiz_count = cursor.fetchone()[0]
        conn.close()
        
        is_first_quiz = quiz_count == 0
        if is_first_quiz:
            points += 50  # First-time bonus
        
        # Award points
        description = f"Quiz completed with {int(quiz_score * 100)}% score"
        if is_first_quiz:
            description += " (First Quiz Bonus!)"
            
        transaction_id = award_points(user_id, points, activity_type, description)
        
        # Get updated user stats
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        cursor.execute('SELECT total_points, level FROM users WHERE user_id = ?', (user_id,))
        user_stats = cursor.fetchone()
        conn.close()
        
        print(f"🎯 Points awarded: {points} to user {user_id}")
        
        return jsonify({
            'status': 'success',
            'points_awarded': {
                'points_earned': points,
                'transaction_id': transaction_id,
                'activity_type': activity_type,
                'is_first_quiz': is_first_quiz
            },
            'user_stats': {
                'total_points': user_stats[0] if user_stats else 0,
                'level': user_stats[1] if user_stats else 1
            },
            'quiz_score': quiz_score
        })
    except Exception as e:
        print(f"❌ Error submitting quiz: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get leaderboard data"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT user_id, username, total_points, level,
                   ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
            FROM users
            WHERE total_points > 0
            ORDER BY total_points DESC
            LIMIT ?
        ''', (limit,))
        
        leaderboard_data = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'leaderboard': [
                {
                    'user_id': entry[0],
                    'username': entry[1],
                    'total_points': entry[2],
                    'level': entry[3],
                    'rank': entry[4]
                } for entry in leaderboard_data
            ]
        })
    except Exception as e:
        print(f"❌ Error getting leaderboard: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    print("🚀 Starting Tayyari.ai backend with gamification on http://localhost:5000...")
    app.run(debug=True, host='0.0.0.0', port=5000)