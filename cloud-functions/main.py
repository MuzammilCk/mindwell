import functions_framework
from flask import jsonify
from google.cloud import firestore
import vertexai
from vertexai.generative_models import GenerativeModel
import datetime
import os

# --- CONFIGURATION ---
# Auto-detect project ID or use default
PROJECT_ID = os.environ.get("GCP_PROJECT") or "mindwell-481215"
LOCATION = "us-central1"

# --- INIT CLIENTS ---
init_error = None
try:
    db = firestore.Client()
except Exception as e:
    print(f"⚠️ Firestore Warning: {e}")
    db = None

try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    # Using Gemini 1.5 Flash for speed
    model = GenerativeModel("gemini-1.5-flash-001")
except Exception as e:
    print(f"⚠️ Vertex AI Warning: {e}")
    init_error = str(e)
    model = None

@functions_framework.http
def submit_screening_report(request):
    """
    1. Receives data from Agent.
    2. Uses Vertex AI to generate a 'Clinical Impression'.
    3. Saves to Firestore.
    """
    # CORS Headers
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        })

    headers = {'Access-Control-Allow-Origin': '*'}
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return (jsonify({"error": "No JSON received"}), 400, headers)

    risk_score = request_json.get('risk_score')
    summary = request_json.get('summary', 'No summary.')

    # --- THE INTELLIGENCE (Vertex AI) ---
    clinical_note = "AI Analysis Unavailable"
    
    if model:
        try:
            print(f"🧠 Asking Gemini to review: {summary}")
            prompt = f"""
            Act as a senior psychiatrist. 
            Review this student screening:
            - Summary: "{summary}"
            - Risk Score: {risk_score}/10
            
            Task: Write a 1-sentence clinical impression validating this score.
            """
            response = model.generate_content(prompt)
            clinical_note = response.text.strip()
            print(f"✅ Gemini Response: {clinical_note}")
        except Exception as e:
            err_msg = str(e)
            print(f"❌ AI Error: {err_msg}")
            clinical_note = f"Error: {err_msg}"
    else:
        clinical_note = f"Init Failed: {init_error}" if init_error else "Model not initialized"

    # --- SAVE TO DATABASE ---
    if db:
        try:
            doc_ref = db.collection('screenings').add({
                "risk_score": risk_score,
                "summary": summary,
                "clinical_impression": clinical_note, # <--- The Smart Part
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "source": "MindWell Agent"
            })
            print("💾 Saved to Firestore")
        except Exception as e:
            print(f"❌ DB Error: {e}")

    return (jsonify({
        "status": "success", 
        "ai_validation": clinical_note
    }), 200, headers)

@functions_framework.http
def get_helplines(request):
    """ Returns specific Indian resources. """
    if request.method == 'OPTIONS':
        return ('', 204, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type'})

    helplines = [
        {"name": "Tele-MANAS", "number": "14416", "desc": "Govt. of India (24/7)"},
        {"name": "iCALL", "number": "9152987821", "desc": "TISS (Mon-Sat)"}
    ]
    return (jsonify({"helplines": helplines}), 200, {'Access-Control-Allow-Origin': '*'})
