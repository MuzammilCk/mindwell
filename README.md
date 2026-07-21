<div align="center">

# 🧠 MindWell

### **Real-Time Voice-First Mental Health Screening & Crisis Triage Engine**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Google Gemini 2.5](https://img.shields.io/badge/AI%20Engine-Google%20Gemini%202.5-4285F4.svg)](https://deepmind.google/technologies/gemini/)
[![Sarvam AI](https://img.shields.io/badge/Voice%20Stack-Sarvam%20AI-FF6F00.svg)](https://www.sarvam.ai/)
[![React + Vite](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*An empathetic, zero-latency conversational companion designed to lower barriers to early mental health support using acoustic signals, clinical frameworks (PHQ-9/GAD-7), and localized multilingual voice AI.*

</div>

---

## 📑 Table of Contents

- [Executive Overview](#-executive-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Clinical & Telemetry Schemas](#-clinical--telemetry-schemas)
- [Safety & Crisis Intervention](#-safety--crisis-intervention)
- [Enterprise Roadmap](#-enterprise-roadmap)
- [Medical Disclaimer](#-medical-disclaimer)
- [License](#-license)

---

## 🔬 Executive Overview

Mental health challenges among students and young adults frequently go undetected due to social stigma, high consultation costs, and shortages of qualified counseling staff. Standard text-based chatbots often feel cold, clinical, and detached, failing to capture the nuance of spoken human emotion.

**MindWell** bridges this gap by delivering an ultra-low-latency, voice-first screening experience. By pairing **Sarvam AI’s native speech intelligence** with **Google Gemini’s advanced reasoning engine**, MindWell conducts warm, context-aware conversations, extracts acoustic and clinical distress markers, and surfaces early risk indicators—all while remaining affordable, localized, and compliant with data privacy frameworks.

---

## ✨ Key Features

* 🎙️ **Native Code-Mixed Voice Support**: Powered by Sarvam Saaras v3, MindWell seamlessly transcribes and understands Hinglish, regional phrases, and mid-sentence language switches common across India.
* 🧠 **Gemini-Powered Clinical Reasoning**: Uses Google Gemini to analyze conversational context, calculate clinical risk signals (PHQ-9 / GAD-7 frameworks), and enforce empathetic boundaries[cite: 1].
* 🗣️ **Human-like Regional Voice Synthesis**: Generates expressive, calm speech responses using Sarvam Bulbul v3 with regional cadence (Meera, Arjun, Ritu voices).
* 📊 **Real-Time Clinical Telemetry**: Generates structured, hidden JSON telemetry alongside conversational responses to track emotional states without interrupting session flow.
* 🚨 **Automated Emergency Safety Protocols**: Instantly detects acute distress markers and triggers warm handoffs to crisis helplines (e.g., Tele-MANAS).
* 🔒 **Onshore & Privacy-Compliant**: Built with strict zero-data-retention parameters, adhering to DPDP (Digital Personal Data Protection) act standards.

---

## 📐 System Architecture

                              +-----------------------+
                              |   User Speech Input   |
                              +-----------+-----------+
                                          |
                                          v
                        +-----------------------------------+
                        |   Sarvam Saaras v3 Streaming STT  |
                        | (Speech-to-Text & Code-Switching) |
                        +-----------------+-----------------+
                                          |
                                          v
                        +-----------------------------------+
                        |   Google Gemini 2.5 Flash Engine  |
                        |   - Empathetic Response Generation|
                        |   - PHQ-9 / GAD-7 Risk Assessment |
                        |   - Emergency Safety Guardrails   |
                        +-----------------+-----------------+
                                          |
                                          v
                        +-----------------------------------+
                        |   Sarvam Bulbul v3 Streaming TTS  |
                        |  (Native Regional Voice Synthesis) |
                        +-----------------+-----------------+
                                          |
                                          v
                              +-----------------------+
                              | Client Audio Playback |
                              |   & Risk Dashboard    |
                              +-----------------------+

---

## 🛠️ Tech Stack

### **Core AI & Speech Engines**
* **Intelligence Layer**: [Google Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/) (JSON Schema structured output, system prompts)[cite: 1]
* **Speech-to-Text (STT)**: [Sarvam AI Saaras v3](https://www.sarvam.ai/) (Multilingual, code-mixed voice recognition)
* **Text-to-Speech (TTS)**: [Sarvam AI Bulbul v3](https://www.sarvam.ai/) (High-expressivity Indian vocal models)

### **Backend Gateway**
* **Framework**: FastAPI (Python 3.10+)[cite: 1]
* **Concurrency**: Asyncio & Uvicorn ASGI server
* **SDKs**: `google-genai`, `sarvamai`

### **Frontend Interface**
* **Framework**: React 18 + Vite[cite: 1]
* **Styling**: Tailwind CSS[cite: 1]
* **Audio Capture**: Web Audio API / MediaRecorder

---

## 📂 Project Structure

```text
mindwell/
├── cloud-functions/              # FastAPI Backend Gateway
│   ├── main.py                   # Primary API Routes & Core Pipeline
│   ├── models.log                # Service execution & model logs
│   ├── requirements.txt          # Python dependencies
│   ├── test_gemini.py            # Gemini prompt validation script
│   └── test_complex_scenarios.py # Clinical edge-case test suite
├── frontend/                     # React Single Page Application
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   └── Conversation.jsx  # Main voice UI & audio recorder
│   │   ├── App.jsx               # Main application container
│   │   ├── index.css             # Tailwind base styles
│   │   └── main.jsx              # React entrypoint
│   ├── package.json              # Frontend dependencies
│   └── vite.config.js            # Vite build configuration
├── PROMPT_SETUP.md               # Gemini System Prompts & Clinical Frameworks
└── README.md                     # Enterprise Documentation
🚀 Getting Started
Prerequisites
Python 3.10 or higher installed

Node.js v18+ and npm installed

API Keys:

Google Gemini API Key

Sarvam AI Subscription Key

Environment Configuration
Create a .env file inside the cloud-functions/ directory:

Code snippet
# Core API Keys
GEMINI_API_KEY="your-google-gemini-api-key"
SARVAM_API_KEY="your-sarvam-ai-api-key"

# Voice & Model Configuration
SARVAM_STT_MODEL="saaras:v3"
SARVAM_TTS_MODEL="bulbul:v3"
SARVAM_DEFAULT_VOICE="meera"
DEFAULT_LANGUAGE_CODE="en-IN"
Backend Setup
Bash
# Navigate to backend directory
cd cloud-functions

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --reload --port 8000
The API will be available at http://localhost:8000 (Swagger docs at http://localhost:8000/docs).

Frontend Setup
Bash
# Navigate to frontend directory
cd frontend

# Install node modules
npm install

# Start Vite development server
npm run dev
The app will be accessible at http://localhost:5173.

📊 Clinical & Telemetry Schemas
During every voice turn, Gemini outputs a synchronized JSON response containing both conversational text and structured telemetry:

JSON
{
  "spoken_response": "I hear how heavy things feel right now with your upcoming exams. It is completely natural to feel overwhelmed, but remember to take things one step at a time.",
  "clinical_telemetry": {
    "detected_emotions": ["anxiety", "academic_stress"],
    "phq9_risk_indicator": "moderate",
    "gad7_risk_indicator": "high",
    "requires_crisis_intervention": false,
    "recommended_resource": "breathing_exercise"
  }
}
🚨 Safety & Crisis Intervention
MindWell is engineered with an active safety circuit:

Trigger Identification: If Gemini or STT transcripts detect acute risk phrases, self-harm signals, or extreme despair, the system updates requires_crisis_intervention: true.

Immediate Intercept: The conversation engine pauses normal reflection and streams a priority response containing national helpline contact information.

Emergency Helplines (India):

Tele-MANAS: 14416 or 1800 891 4416

KIRAN: 1800-599-0019

🛣️ Enterprise Roadmap
[x] Phase 1: Initial Prototype with Gemini reasoning & cloud function architecture[cite: 1].

[x] Phase 2: Complete migration from ElevenLabs to Sarvam AI voice stack (Saaras v3 + Bulbul v3).

[ ] Phase 3: WebSockets integration via LiveKit/Pipecat for sub-300ms bidirectional voice streaming.

[ ] Phase 4: B2B Institutional Dashboard for university counseling centers (anonymized campus stress analytics).

[ ] Phase 5: Longitudinal offline-first mood tracking and therapist report generation.

⚠️ Medical Disclaimer
IMPORTANT: MindWell is an AI-powered screening and emotional grounding companion[cite: 1]. It does not provide medical advice, psychiatric diagnosis, or formal clinical treatment[cite: 1]. MindWell is intended solely for early self-reflection and triage[cite: 1]. Anyone experiencing a mental health emergency should immediately contact qualified healthcare professionals or emergency hotline services.

📜 License
Distributed under the MIT License. See LICENSE for details.
