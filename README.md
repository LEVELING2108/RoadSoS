# 🚑 ROADSoS: AI-Driven Emergency Response Ecosystem

[![React](https://img.shields.io/badge/Frontend-React%2019-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![AI-Powered](https://img.shields.io/badge/AI-Gemini%201.5%20Pro-red?logo=google-gemini)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**ROADSoS** is a world-class, AI-driven emergency assistance platform that transforms your smartphone into an autonomous digital first responder. By combining advanced Computer Vision, Real-Time WebSockets, and Conversational AI, ROADSoS provides life-saving triage and monitoring when every second is critical.

---

## 🌟 Next-Level AI Features

- **🌍 Global Localization (i18n)**: Full multi-language support (English, Spanish, French, Hindi). The app, Voice AI, and Vision AI all adapt to your selected language.
- **🚨 Region-Specific SOS**: Automatically detects your country via GPS and provides direct-dial buttons for local authorities (e.g., 911, 112, 100/108).
- **🧠 AI Vision Triage**: Snap a photo of an accident scene. Gemini 1.5 Pro instantly identifies hazards and provides instructions in your language.
- **🎙️ Conversational Voice Dispatcher**: A hands-free, empathetic Voice AI that triages victims, provides calm guidance, and builds medical reports via natural conversation.
- **🗺️ Predictive Smart Routing**: AI-powered dispatch that routes victims to the *best* specialized facility (Trauma, Burn Unit, etc.) based on real-time triage data.
- **🛰️ Live SOS Tracking**: Secure WebSocket streams allowing emergency contacts to watch your GPS location move live on a shared dashboard.
- **⚡ Advanced Reliability**: 
    - **Zero-Stale Geolocation**: Forced fresh GPS locks (zero caching) to ensure accuracy in fast-moving emergencies.
    - **Smart Fallback**: Intelligent location retention that keeps you protected even if GPS signal is temporarily lost.
    - **UI-Sync Precision**: Real-time map and UI synchronization with device hardware for seamless movement tracking.
- **🎯 Precision Haptics**: Native-feel physical feedback for critical actions, ensuring clarity in high-stress situations.

---

## 🛠️ Tech Stack

### AI & Intelligence
- **Vision/NLP**: Google Gemini 1.5 Pro
- **Bio-Signals**: rPPG Pixel Analysis (Canvas API)
- **Voice**: Web Speech API (Synthesis & Recognition)

### Frontend & Real-Time
- **Framework**: React 19 (TypeScript)
- **Animations**: Framer Motion (Fluid gestures & staggered transitions)
- **Connectivity**: WebSockets (Bidirectional streaming)
- **Mapping**: React-Leaflet / OSRM Routing Engine
- **PWA**: Fully offline-capable with Service Workers

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Session Management**: UUID-based secure tracking sessions
- **Async**: HTTPX / Uvicorn for high-concurrency emergency requests


---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/scripts/activate  # Windows: .\venv\Scripts\activate
pip install fastapi uvicorn httpx
python main.py
```
*Backend runs on `http://localhost:8000`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 📖 API Documentation

The backend provides a clean REST API. Once the backend is running, you can access the interactive Swagger docs at:
`http://localhost:8000/docs`

### Primary Endpoint
`GET /api/emergency-services`
- **Params**: `lat`, `lon`, `radius` (meters)
- **Returns**: Geo-tagged list of nearby emergency facilities.

---

## 🛡️ Safety Notice
ROADSoS is a support tool. Always dial local emergency numbers (911, 112, 999) as your first course of action in a life-threatening situation.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

Developed with ❤️ for Global Safety.
