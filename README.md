# 🚑 ROADSoS: Emergency Global Support Network

[![React](https://img.shields.io/badge/Frontend-React%2019-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?logo=vite)](https://vitejs.dev/)

**ROADSoS** is a high-performance, mobile-first emergency assistance platform designed to provide instant access to critical services when every second counts. By integrating real-time geolocation with the OpenStreetMap Overpass API, ROADSoS connects users to the nearest hospitals, police stations, and repair services globally, even in low-connectivity environments.

---

## 🌟 Key Features

- **🎯 Precision SOS**: One-tap emergency discovery using high-accuracy GPS with haptic feedback.
- **🎙️ Voice-Activated SOS**: Hands-free emergency trigger using the Web Speech API (Say "Help Help Help").
- **🛰️ Live tracking (WebSockets)**: Generate real-time tracking links for emergency contacts via secure WebSocket streams.
- **🗺️ In-App Navigation**: Integrated OSRM routing engine providing turn-by-turn directions directly on the map.
- **🏥 Categorized Search**: Quickly filter between Medical, Security, Roadside Repairs, and First Aid.
- **🩸 Emergency Profile**: Securely store blood group and medical notes for first responders.
- **📡 Offline Resiliency**: PWA-ready with caching for offline access to critical First Aid data.
- **🌓 Dark Mode**: Modern, high-contrast interface with fluid `framer-motion` animations.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (TypeScript)
- **Animations**: Framer Motion (Gestures & Staggered Transitions)
- **Real-Time**: WebSockets (Live Location Streaming)
- **Voice**: Web Speech API
- **Routing**: OSRM API / Leaflet Polyline
- **Tooling**: Vite (Lightning-fast HMR)
- **Styling**: Modern Vanilla CSS with CSS Variables
- **Mapping**: React-Leaflet / OpenStreetMap
- **Icons**: Lucide-React
- **PWA**: Vite PWA Plugin

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Real-Time**: WebSockets (Asynchronous session management)
- **Networking**: HTTPX (Asynchronous requests)
- **Data Source**: Overpass API (OpenStreetMap)

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
