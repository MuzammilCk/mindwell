import functions_framework
from flask import jsonify
from google.cloud import firestore
import google.generativeai as genai
import datetime
import os
from dotenv import load_dotenv

load_dotenv() # Load variables from .env if present

# --- CONFIGURATION (SECURE) ---
API_KEY = os.environ.get("GEMINI_API_KEY")

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
        model = genai.GenerativeModel('gemini-2.0-flash')
        print("✅ Gemini API Connected (gemini-2.0-flash)")
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

    # Extract fields (Agents only send summary now)
    summary = request_json.get('summary', 'No summary provided.')
    print(f"📥 Received Summary: {summary[:50]}...")

    # --- GEMINI INTELLIGENCE (Diagnosis & Scoring) ---
    gemini_result = {
        "score": 0,
        "reasoning": "Assessment pending."
    }
    
    if model:
        try:
            prompt = f"""You are a senior clinical psychologist. Analyze the following patient summary from a screening interview.

PATIENT SUMMARY:
{summary}

TASK:
1. Assign a Risk Score (0-10) based on these factors:
   - Physical symptoms (sleep/appetite): +2
   - Emotional distress (hopelessness): +3
   - Social withdrawal: +2
   - Risk of self-harm: +10 (Immediate High Risk)
   
2. Write a 1-sentence clinical validation (under 20 words).

OUTPUT FORMAT (Strict JSON):
{{
  "score": int,
  "reasoning": "string"
}}
"""
            # NEW: Configure Safety Settings to allow medical/symptom analysis
            from google.generativeai.types import HarmCategory, HarmBlockThreshold
            
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }

            response = model.generate_content(
                prompt, 
                generation_config={"response_mime_type": "application/json"},
                safety_settings=safety_settings
            )
            
            try:
                # Debug: Print raw text to see if it's blocked or markdown-wrapped
                raw_text = response.text
                print(f"🔍 Raw Gemini Response: {raw_text}")
                
                # Clean Markdown (```json ... ```)
                cleaned_text = raw_text.replace("```json", "").replace("```", "").strip()
                
                import json
                gemini_result = json.loads(cleaned_text)
                print(f"✅ Gemini Analysis: {gemini_result}")
                
            except Exception as parse_error:
                print(f"⚠️ Response Parsing Error: {parse_error}")
                # Log feedback if blocked
                if response.prompt_feedback:
                    print(f"⚠️ Safety Feedback: {response.prompt_feedback}")
                raise parse_error

        except Exception as e:
            print(f"❌ Gemini System Error: {type(e).__name__} - {e}")
            gemini_result = {"score": 0, "reasoning": "Clinical system error. Manual review required."}

    # Use Gemini's calculated data
    final_score = gemini_result.get("score", 0)
    final_reasoning = gemini_result.get("reasoning", "No reasoning provided.")

    # --- SAVE TO FIRESTORE ---
    doc_id = None
    if db:
        try:
            doc_ref = db.collection('screenings').add({
                "risk_score": final_score,
                "summary": summary,
                "agent_validation": "Agent observation only", # Deprecated agent scoring
                "gemini_impression": final_reasoning,
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "model": "gemini-2.0-flash",
                "source": "MindWell Agent v2 (Gemini-Backend)"
            })
            doc_id = doc_ref[1].id
            print(f"💾 Saved to Firestore: {doc_id}")
        except Exception as e:
            print(f"❌ Firestore Error: {e}")

    # --- RETURN TO AGENT/FRONTEND ---
    return (jsonify({
        "success": True,
        "result": {
            "validation": final_reasoning,
            "score": final_score,
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