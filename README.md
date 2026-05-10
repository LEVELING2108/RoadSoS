# 🚑 ROADSoS: High-Performance Emergency Response Ecosystem

[![React](https://img.shields.io/badge/Frontend-React%2019-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**ROADSoS** is a world-class emergency assistance platform that transforms your smartphone into an autonomous digital first responder. By combining real-time location intelligence, high-performance service discovery, and secure live tracking, ROADSoS provides critical coordination when every second counts.

---

## 🌟 Key Features

- **🌍 Global Localization (i18n)**: Full multi-language support across dozens of languages. The app automatically adapts its UI and voice guidance to your selected locale.
- **🚨 Region-Specific SOS**: Automatically detects your country via GPS and provides direct-dial buttons for local authorities (e.g., 911, 112, 100/108).
- **🗺️ Intelligent Service Discovery**: Instantly locates nearby hospitals, clinics, police stations, and repair shops using an optimized Overpass API integration with intelligent caching.
- **🛰️ Live SOS Tracking**: Secure WebSocket streams allowing emergency contacts to watch your GPS location move live on a shared dashboard.
- **⚡ Advanced Reliability & Performance**: 
    - **Connection Pooling**: Backend optimized with global HTTP connection pooling for lightning-fast service discovery.
    - **Smart Geolocation**: Dual-mode GPS strategy that balances extreme accuracy during emergencies with battery-efficient background monitoring.
    - **Zero-Stale Geolocation**: Forced fresh GPS locks to ensure accuracy in fast-moving emergencies.
- **🎯 Precision Haptics**: Native-feel physical feedback for critical actions, ensuring clarity in high-stress situations.
- **💓 Vital Monitoring (rPPG)**: Experimental camera-based heart rate monitoring using pixel analysis for immediate vital assessment.

---

## 🛠️ Tech Stack

### Intelligence & Vitals
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
- **HTTP Engine**: HTTPX with Connection Pooling
- **Session Management**: UUID-based secure tracking sessions
--


## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/scripts/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
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
