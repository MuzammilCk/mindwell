import os
import json
import asyncio
import base64
import traceback
from dotenv import load_dotenv

# Load environment variables from .env (checks local directory and parent directory)
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
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

# ═══════════════════════════════════════════
# ═══ SYSTEM PROMPT & CONFIG ═══
# ═══════════════════════════════════════════

SYSTEM_PROMPT = """
You are MindWell, a compassionate voice-first mental health screening AI designed for Indian students.

CRITICAL LANGUAGE RULE:
- You MUST respond in the SAME language the user is speaking.
- If the user speaks in Hindi, respond entirely in Hindi.
- If the user speaks in Tamil, respond entirely in Tamil.
- If the user speaks in code-mixed Hinglish, respond in the same Hinglish style.
- Match the user's language naturally — never force English on a non-English speaker.

RESPONSE FORMAT — always respond in valid JSON with exactly these two keys:
1. "spoken_response": A short, warm, human-like response (max 40 words) IN THE USER'S LANGUAGE.
2. "clinical_telemetry": An object containing:
   - "detected_emotions": array of emotion strings
   - "phq9_risk_indicator": "low" | "moderate" | "high" | "severe"
   - "gad7_risk_indicator": "low" | "moderate" | "high" | "severe"
   - "requires_crisis_intervention": boolean
   - "recommended_resource": optional string

GUIDELINES:
- Be warm, non-judgmental, and empathetic.
- Ask gentle follow-up questions to understand the user's state.
- Never diagnose — you are a screening companion, not a doctor.
- If the user shows signs of self-harm or crisis, set requires_crisis_intervention to true.
"""

# TTS-supported languages (Sarvam Bulbul v3)
TTS_SUPPORTED_LANGUAGES = {
    'bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN',
    'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN'
}

LANGUAGE_NAMES = {
    'hi-IN': 'Hindi', 'en-IN': 'English', 'bn-IN': 'Bengali',
    'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati',
    'pa-IN': 'Punjabi', 'od-IN': 'Odia', 'as-IN': 'Assamese',
    'ur-IN': 'Urdu', 'ne-IN': 'Nepali', 'kok-IN': 'Konkani',
    'ks-IN': 'Kashmiri', 'sd-IN': 'Sindhi', 'sa-IN': 'Sanskrit',
    'sat-IN': 'Santali', 'mni-IN': 'Manipuri', 'brx-IN': 'Bodo',
    'mai-IN': 'Maithili', 'doi-IN': 'Dogri',
}

VALID_SPEAKERS = {
    'anushka', 'abhilash', 'manisha', 'vidya', 'arya', 'karun', 'hitesh',
    'aditya', 'ritu', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran',
    'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan',
    'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'ashutosh', 'advait',
    'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti',
    'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'
}


# ═══════════════════════════════════════════
# ═══ SHARED PROCESSING PIPELINE ═══
# ═══════════════════════════════════════════

async def process_transcript(transcript: str, detected_lang: str, chat_history: list, voice_id: str = "ritu"):
    """
    Shared pipeline: Gemini reasoning + TTS synthesis.
    Returns a dict with spoken_response, audio_base64, telemetry, detected_language.
    """
    detected_lang_name = LANGUAGE_NAMES.get(detected_lang, detected_lang)

    print(f"[PIPELINE] Language: {detected_lang} ({detected_lang_name})")
    print(f"[PIPELINE] Transcript: {transcript[:100]}")

    # ─── Build Gemini Messages ───
    messages = [
        types.Content(role="user", parts=[types.Part.from_text(text=f"System Context: {SYSTEM_PROMPT}")])
    ]

    for msg in chat_history:
        messages.append(types.Content(
            role="user" if msg.get("sender") == "user" else "model",
            parts=[types.Part.from_text(text=msg.get("text", ""))]
        ))

    lang_hint = f"[The user is speaking in {detected_lang_name} ({detected_lang}). Respond in {detected_lang_name}.]"
    messages.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=f"{lang_hint}\n\nUser says: {transcript}")]
    ))

    # ─── Gemini Call ───
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

    print(f"[PIPELINE] AI Response: {spoken_text[:100]}")

    # ─── Crisis Handling ───
    if telemetry.get("requires_crisis_intervention"):
        crisis_msgs = [
            types.Content(role="user", parts=[types.Part.from_text(
                text=f"Translate this crisis message into {detected_lang_name}: "
                     f"'I hear how much pain you are in right now. Please know you are not alone. "
                     f"Let me connect you directly to support services. Please call Tele-MANAS at 14416.'"
                     f"\n\nRespond with ONLY the translated text, nothing else."
            )])
        ]
        try:
            crisis_response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=crisis_msgs,
                config=types.GenerateContentConfig(temperature=0.1)
            )
            spoken_text = crisis_response.text.strip().strip('"')
        except Exception:
            spoken_text = "I hear how much pain you are in right now. Please know you are not alone."

    # ─── TTS ───
    tts_language = detected_lang if detected_lang in TTS_SUPPORTED_LANGUAGES else "hi-IN"
    selected_speaker = voice_id if voice_id in VALID_SPEAKERS else "ritu"

    tts_response = await sarvam_client.text_to_speech.convert(
        text=spoken_text,
        target_language_code=tts_language,
        speaker=selected_speaker,
        model="bulbul:v3",
        pace=1.0,
        enable_preprocessing=True
    )

    print(f"[PIPELINE] TTS Language: {tts_language}, Speaker: {selected_speaker}")

    return {
        "user_transcript": transcript,
        "spoken_response": spoken_text,
        "audio_base64": tts_response.audios[0],
        "telemetry": telemetry,
        "detected_language": {
            "code": detected_lang,
            "name": detected_lang_name,
        }
    }


# ═══════════════════════════════════════════
# ═══ WEBSOCKET STREAMING ENDPOINT ═══
# ═══════════════════════════════════════════

@app.websocket("/ws/conversation")
async def websocket_conversation(websocket: WebSocket):
    """
    WebSocket endpoint for natural streaming conversation.
    
    Frontend sends:
      {"type": "audio", "audio": "<base64_pcm>"}   — raw PCM audio chunks
      {"type": "end"}                                — end conversation
    
    Backend sends:
      {"type": "speech_start"}                       — VAD detected speech start
      {"type": "speech_end"}                         — VAD detected speech end
      {"type": "processing"}                         — transcript received, processing
      {"type": "response", ...}                      — full response with audio
      {"type": "ready"}                              — ready for next utterance
      {"type": "error", "detail": "..."}             — error message
    """
    await websocket.accept()
    print("[WS] Client connected")

    chat_history = []
    should_stop = False

    try:
        async with sarvam_client.speech_to_text_streaming.connect(
            language_code="unknown",
            model="saaras:v3",
            mode="transcribe",
            high_vad_sensitivity="true",
            vad_signals="true",
            input_audio_codec="pcm_s16le",
            sample_rate="16000",
        ) as stt_socket:
            print("[WS] Sarvam streaming STT connected")

            async def forward_audio_to_sarvam():
                """Receive audio chunks from frontend and forward to Sarvam STT."""
                nonlocal should_stop
                try:
                    while not should_stop:
                        raw = await websocket.receive_text()
                        msg = json.loads(raw)

                        if msg.get("type") == "audio" and msg.get("audio"):
                            await stt_socket.transcribe(
                                audio=msg["audio"],
                                encoding="pcm_s16le",
                                sample_rate=16000
                            )
                        elif msg.get("type") == "end":
                            print("[WS] Client requested end")
                            should_stop = True
                            break
                except WebSocketDisconnect:
                    print("[WS] Client disconnected during audio forward")
                    should_stop = True
                except Exception as e:
                    print(f"[WS] Audio forward error: {e}")
                    should_stop = True

            async def receive_sarvam_events():
                """Receive events from Sarvam STT (VAD signals + transcripts)."""
                nonlocal should_stop
                try:
                    while not should_stop:
                        response = await stt_socket.recv()

                        if response.type == "events":
                            event_data = response.data
                            signal = getattr(event_data, 'signal_type', None)

                            if signal == "START_SPEECH":
                                print("[VAD] Speech started")
                                try:
                                    await websocket.send_json({"type": "speech_start"})
                                except Exception:
                                    break

                            elif signal == "END_SPEECH":
                                print("[VAD] Speech ended")
                                try:
                                    await websocket.send_json({"type": "speech_end"})
                                except Exception:
                                    break

                        elif response.type == "data":
                            transcript_data = response.data
                            transcript = getattr(transcript_data, 'transcript', '')
                            detected_lang = getattr(transcript_data, 'language_code', 'en-IN') or 'en-IN'

                            if not transcript or not transcript.strip():
                                print("[STT] Empty transcript, skipping")
                                continue

                            print(f"[STT] Final transcript: {transcript}")
                            print(f"[STT] Language: {detected_lang}")

                            # Notify frontend we're processing
                            try:
                                await websocket.send_json({"type": "processing", "transcript": transcript})
                            except Exception:
                                break

                            # Process through Gemini + TTS
                            try:
                                result = await process_transcript(
                                    transcript=transcript,
                                    detected_lang=detected_lang,
                                    chat_history=chat_history,
                                    voice_id="ritu"
                                )

                                # Update chat history
                                chat_history.append({"sender": "user", "text": transcript})
                                chat_history.append({"sender": "ai", "text": result["spoken_response"]})

                                # Send response to frontend
                                await websocket.send_json({
                                    "type": "response",
                                    **result
                                })

                                # Signal ready for next utterance
                                await websocket.send_json({"type": "ready"})
                                print("[WS] Response sent, ready for next utterance")

                            except Exception as e:
                                print(f"[PIPELINE] Error: {e}")
                                traceback.print_exc()
                                try:
                                    await websocket.send_json({
                                        "type": "error",
                                        "detail": f"Processing failed: {str(e)}"
                                    })
                                except Exception:
                                    break

                        elif response.type == "error":
                            error_data = response.data
                            print(f"[STT] Error: {getattr(error_data, 'error', 'unknown')}")
                            try:
                                await websocket.send_json({
                                    "type": "error",
                                    "detail": f"STT error: {getattr(error_data, 'error', 'unknown')}"
                                })
                            except Exception:
                                break

                except Exception as e:
                    if not should_stop:
                        print(f"[WS] Sarvam recv error: {e}")
                        traceback.print_exc()

            # Run both tasks concurrently
            await asyncio.gather(
                forward_audio_to_sarvam(),
                receive_sarvam_events(),
                return_exceptions=True
            )

    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Connection error: {e}")
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "detail": str(e)})
        except Exception:
            pass
    finally:
        print("[WS] Session ended")


# ═══════════════════════════════════════════
# ═══ REST FALLBACK ENDPOINT ═══
# ═══════════════════════════════════════════

@app.post("/api/v1/voice-turn")
async def process_voice_turn(
    audio: UploadFile = File(...),
    language_code: str = Form("unknown"),
    voice_id: str = Form("ritu"),
    chat_history: str = Form("[]")
):
    """REST fallback endpoint for non-streaming voice turns."""
    try:
        audio_bytes = await audio.read()

        stt_response = await sarvam_client.speech_to_text.transcribe(
            file=(audio.filename or "audio.webm", audio_bytes, audio.content_type or "audio/webm"),
            model="saaras:v3",
            language_code=language_code,
            mode="transcribe"
        )

        user_transcript = stt_response.transcript
        if not user_transcript.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio.")

        detected_lang = stt_response.language_code or "en-IN"
        parsed_history = json.loads(chat_history)

        result = await process_transcript(
            transcript=user_transcript,
            detected_lang=detected_lang,
            chat_history=parsed_history,
            voice_id=voice_id
        )

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")
