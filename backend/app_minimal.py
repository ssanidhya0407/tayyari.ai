from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:3001"], "methods": ["GET", "POST"], "allow_headers": ["Content-Type"]}})

@app.route('/', methods=['GET'])
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
        
        if not files and not notes.strip():
            return jsonify({
                'error': 'No files or notes provided. Please upload PDF files or add notes.',
                'debug_info': {
                    'received_files': files,
                    'received_notes_length': len(notes) if notes else 0
                }
            }), 400

        # Demo response for when API keys are not configured
        demo_response = f"""## 📘 Learning Assistant

**Topic:** {notes[:100]}{"..." if len(notes) > 100 else ""}

### Key Concepts:
• This is a demonstration of the Tayyari learning platform
• The system provides interactive educational content
• Features include quizzes, visual diagrams, and structured learning paths
• Configure API keys to enable full AI-powered responses

### Learning Structure:
1. **Foundation** - Core concepts and terminology
2. **Application** - Practical examples and use cases  
3. **Practice** - Interactive exercises and challenges
4. **Assessment** - Knowledge validation through quizzes

### Interactive Features:
- **Quizzes**: Test your understanding with multiple choice questions
- **Diagrams**: Visual representations of complex concepts
- **Code Examples**: Practical implementations and snippets
- **Progress Tracking**: Monitor your learning journey

*Ready to start learning? Try the quiz mode or ask follow-up questions!*"""

        return jsonify({
            'response': demo_response,
            'status': 'success',
            'mermaidChart': '''graph TD
    A[Start Learning] --> B[Read Content]
    B --> C[Take Quiz]
    C --> D{Pass Quiz?}
    D -->|Yes| E[Next Topic]
    D -->|No| F[Review Material]
    F --> B
    E --> G[Complete Course]''',
            'debug_info': {
                'content_length': len(notes),
                'files_processed': len(files),
                'had_notes': bool(notes and notes.strip())
            }
        })
    except Exception as e:
        return jsonify({
            'error': 'Server error occurred',
            'technical_error': str(e)
        }), 500

if __name__ == "__main__":
    print("🚀 Starting Tayyari.ai minimal backend on http://localhost:5000...")
    app.run(debug=True, host='0.0.0.0', port=5000)