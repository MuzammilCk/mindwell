import functions_framework
from flask import jsonify
from flask_cors import cross_origin
from google.cloud import firestore
import vertexai
from vertexai.generative_models import GenerativeModel
import datetime
import os

# --- INTELLIGENCE CONFIG ---
# Replace with your actual Google Cloud Project ID
PROJECT_ID = os.environ.get("GCP_PROJECT", "mindwell-481215") 
LOCATION = "us-central1"

# Initialize Database
try:
    db = firestore.Client()
except:
    db = None

# Initialize Vertex AI (The "Brain")
try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    # Gemini 1.5 Pro is smarter for analysis than Flash
    model = GenerativeModel("gemini-1.5-pro-preview-0409")
except:
    model = None

@functions_framework.http
@cross_origin()
def submit_screening_report(request):
    """
    INTELLIGENCE LAYER:
    1. Receives the Agent's rough score.
    2. Asks Vertex AI to validate it (Second Opinion).
    3. Saves the "Smart" report to Firestore.
    """
    request_json = request.get_json(silent=True)
    if not request_json:
        return jsonify({"error": "No data"}), 400

    risk_score = request_json.get('risk_score')
    summary = request_json.get('summary', '')
    
    # --- VERTEX AI ANALYSIS ---
    clinical_analysis = "AI Analysis Unavailable"
    if model:
        try:
            # This makes it "Intelligent". The AI reviews the case.
            prompt = f"""
            You are a senior clinical psychiatrist. Review this screening:
            Patient Statement: "{summary}"
            Preliminary Risk Score: {risk_score}/10
            
            Task:
            1. Validate if the score matches the symptoms.
            2. Write a 1-sentence clinical impression for the doctor.
            """
            response = model.generate_content(prompt)
            clinical_analysis = response.text.strip()
            print(f"🧠 Vertex AI Thought: {clinical_analysis}")
        except Exception as e:
            clinical_analysis = f"Error: {str(e)}"

    # --- MEMORY (Save to DB) ---
    if db:
        doc_ref = db.collection('screenings').add({
            "risk_score": risk_score,
            "summary": summary,
            "clinical_analysis": clinical_analysis, # <--- The intelligent part
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "source": "ElevenLabs Agent"
        })

    return jsonify({
        "status": "success", 
        "ai_validation": clinical_analysis
    }), 200

@functions_framework.http
@cross_origin()
def get_helplines(request):
    """ Returns critical resources. """
    helplines = [
        {"name": "Tele-MANAS", "number": "14416", "desc": "Govt. of India (24/7)"},
        {"name": "iCALL", "number": "9152987821", "desc": "TISS (Mon-Sat)"}
    ]
    return jsonify({"helplines": helplines}), 200
