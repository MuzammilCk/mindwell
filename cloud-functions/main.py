import functions_framework
from flask import jsonify
from google.cloud import firestore
import google.generativeai as genai
import datetime
import os

# --- CONFIGURATION (SECURE) ---
API_KEY = "AIzaSyCmyaNrA30-b0As7_5TqZvmzwUgg7BVDg8"

# --- INIT CLIENTS ---
db = None
try:
    db = firestore.Client()
    print("✅ Firestore Connected")
except Exception as e:
    print(f"⚠️ Firestore Error: {e}")

model = None
if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        print("✅ Gemini API Connected (gemini-2.0-flash-exp)")
    except Exception as e:
        print(f"⚠️ Gemini Init Error: {e}")
else:
    print("⚠️ GEMINI_API_KEY not found in environment")

# --- MAIN FUNCTION ---
@functions_framework.http
def submit_screening_report(request):
    """
    Receives screening data from ElevenLabs Agent → Validates with Gemini → Saves to Firestore
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        })

    headers = {'Access-Control-Allow-Origin': '*'}
    
    # Parse incoming data
    try:
        request_json = request.get_json(silent=True)
        if not request_json:
            return (jsonify({"error": "No JSON payload received"}), 400, headers)
    except Exception as e:
        return (jsonify({"error": f"JSON parse error: {str(e)}"}), 400, headers)

    # Extract fields (with defaults)
    risk_score = request_json.get('risk_score', 0)
    summary = request_json.get('summary', 'No summary provided.')
    agent_validation = request_json.get('validation', 'No reasoning provided.')

    print(f"📥 Received: Score={risk_score}, Summary={summary[:50]}...")

    # --- GEMINI VALIDATION ---
    gemini_impression = "Clinical review pending."
    
    if model:
        try:
            prompt = f"""You are a clinical supervisor reviewing an AI mental health screening.

AGENT'S ASSESSMENT:
- Risk Score: {risk_score}/10
- Patient Summary: {summary}
- Agent's Reasoning: {agent_validation}

SCORING RUBRIC (for reference):
- Physical symptoms (sleep/appetite): +2 each (max +4)
- Emotional distress (hopelessness/self-harm): +3 each (max +6)
- Social withdrawal/isolation: +2 each (max +4)
- Verbal cues (monotone/confusion): +1 each (max +3)

TASK: Write ONE sentence (under 25 words) that either:
1. Confirms the assessment (e.g., "Score appropriate given reported symptoms.")
2. Flags concerns (e.g., "Score underestimates risk; immediate intervention needed.")

Be clinical and specific."""

            response = model.generate_content(prompt)
            gemini_impression = response.text.strip()
            print(f"✅ Gemini: {gemini_impression}")
            
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
            gemini_impression = "Clinical validation unavailable; data recorded for review."

    # --- SAVE TO FIRESTORE ---
    doc_id = None
    if db:
        try:
            doc_ref = db.collection('screenings').add({
                "risk_score": risk_score,
                "summary": summary,
                "agent_validation": agent_validation,
                "gemini_impression": gemini_impression,
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "model": "gemini-2.0-flash-exp",
                "source": "MindWell Agent v1"
            })
            doc_id = doc_ref[1].id
            print(f"💾 Saved to Firestore: {doc_id}")
        except Exception as e:
            print(f"❌ Firestore Error: {e}")

    # --- RETURN TO AGENT (ElevenLabs Format) ---
    return (jsonify({
        "success": True,
        "result": {
            "validation": gemini_impression,
            "firestore_id": doc_id
        }
    }), 200, headers)


@functions_framework.http
def get_helplines(request):
    """Returns Indian mental health helplines."""
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        })

    helplines = [
        {
            "name": "Tele-MANAS",
            "number": "14416",
            "description": "Government of India 24/7 Mental Health Helpline",
            "availability": "24/7"
        },
        {
            "name": "iCALL",
            "number": "9152987821",
            "description": "TISS Psychosocial Helpline",
            "availability": "Monday-Saturday, 8 AM - 10 PM"
        },
        {
            "name": "Vandrevala Foundation",
            "number": "9999666555",
            "description": "24/7 Mental Health Support",
            "availability": "24/7"
        }
    ]
    
    return (jsonify({
        "success": True,
        "helplines": helplines
    }), 200, {'Access-Control-Allow-Origin': '*'})