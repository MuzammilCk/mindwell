import os
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from sarvamai import AsyncSarvamAI

app = FastAPI(title="MindWell AI Core Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SDK Clients
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

sarvam_client = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# System Prompt Definition
SYSTEM_PROMPT = """
You are MindWell, a compassionate voice-first mental health screening AI for students.
Analyze the user's speech transcript and respond in JSON format with:
1. "spoken_response": Short, warm, human-like response (max 40 words).
2. "clinical_telemetry": Object containing risk assessment (PHQ-9 / GAD-7 levels, crisis flag).
"""

@app.post("/api/v1/voice-turn")
async def process_voice_turn(
    audio: UploadFile = File(...),
    language_code: str = Form("en-IN"),
    voice_id: str = Form("meera"),
    chat_history: str = Form("[]")
):
    """
    Complete End-to-End Voice Turn:
    1. Transcribe incoming user audio via Sarvam Saaras v3 STT.
    2. Process transcript + clinical history via Gemini 2.5 Flash.
    3. Synthesize empathetic response audio via Sarvam Bulbul v3 TTS.
    4. Return binary audio + telemetry metadata.
    """
    try:
        # Step 1: Read audio file bytes
        audio_bytes = await audio.read()

        # Step 2: Speech-to-Text using Sarvam AI (Saaras v3)
        stt_response = await sarvam_client.speech_to_text.transcribe(
            file=(audio.filename, audio_bytes, audio.content_type),
            model="saaras:v3",
            language_code=language_code,
            mode="codemix"  # Seamlessly handles mixed English + regional phrases
        )
        
        user_transcript = stt_response.transcript
        if not user_transcript.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio.")

        # Step 3: Formulate Conversation Context for Gemini
        parsed_history = json.loads(chat_history)
        messages = [
            types.Content(role="user", parts=[types.Part.from_text(text=f"System Context: {SYSTEM_PROMPT}")])
        ]
        
        for msg in parsed_history:
            messages.append(types.Content(
                role="user" if msg["sender"] == "user" else "model",
                parts=[types.Part.from_text(text=msg["text"])]
            ))
            
        messages.append(types.Content(
            role="user", 
            parts=[types.Part.from_text(text=f"User says: {user_transcript}")]
        ))

        # Step 4: Gemini Reasoning Engine Call
        gemini_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=messages,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4
            )
        )
        
        ai_output = json.loads(gemini_response.text)
        spoken_text = ai_output.get("spoken_response", "I am here for you. Can you tell me more?")
        telemetry = ai_output.get("clinical_telemetry", {})

        # Step 5: Check for Emergency Crisis Trigger
        if telemetry.get("requires_crisis_intervention"):
            spoken_text = "I hear how much pain you are in right now. Please know you are not alone. Let me connect you directly to support services."

        # Step 6: Text-to-Speech using Sarvam AI (Bulbul v3)
        tts_response = await sarvam_client.text_to_speech.convert(
            inputs=[spoken_text],
            target_language_code=language_code,
            speaker=voice_id,
            model="bulbul:v3",
            pace=1.0,
            enable_preprocessing=True
        )

        # Step 7: Send Payload back to React Frontend
        return JSONResponse(content={
            "user_transcript": user_transcript,
            "spoken_response": spoken_text,
            "audio_base64": tts_response.audios[0],  # Base64 encoded audio string
            "telemetry": telemetry
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")
