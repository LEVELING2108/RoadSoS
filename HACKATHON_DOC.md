# 📄 ROADSoS - Project Technical Documentation
**Format: Word Document Submission**

## 1. Project Overview
ROADSoS is an AI-driven, zero-friction emergency response platform. It utilizes device sensors and high-reliability backend architecture to provide immediate assistance during the "Golden Hour" of road accidents.

## 2. Technical Stack & Software Packages
### Frontend (React PWA)
- **Core**: React 19, TypeScript, Vite
- **Styling & UI**: Vanilla CSS, Lucide React (Icons), Framer Motion (Animations)
- **Mapping**: Leaflet.js, OpenStreetMap (OSM)
- **PWA**: Vite-plugin-PWA, Workbox
- **APIs**: Axios (Networking), i18next (Internationalization)

### Backend (FastAPI)
- **Core**: Python 3.12, FastAPI, Uvicorn
- **Concurrency**: Asyncio
- **Data Layer**: Redis (Python-Redis client), Hiredis
- **Security & Speed**: SlowAPI (Rate limiting), Python-JOSE (JWT handling)
- **Task Management**: Gunicorn (Production server)

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **Data Source**: Overpass API (Multi-mirror parallel search)

## 3. Core Features
1. **Fused Location Engine**: Tiered background tracking for zero-latency SOS.
2. **Shake-to-SOS**: Accelerometer-based emergency trigger with 15G threshold.
3. **AI Vitals Monitor**: Remote Photoplethysmography (rPPG) for heart rate detection via camera.
4. **Mirror Failover**: Backend tracking of 4+ global OSM mirrors for 99.9% data reliability.
5. **Regional Scan**: Automatic Indian state detection and language switching (22+ languages).

## 4. Key Assumptions
- **Hardware**: Assumes the user's device has an accelerometer (for Shake SOS) and a camera (for Vitals Monitor).
- **Permissions**: Assumes the user grants Geolocation and Camera permissions for full functionality.
- **Connectivity**: While designed for low-signal areas via tile caching, an initial connection is assumed for fetching real-time emergency contacts.
- **Accuracy**: GPS accuracy is assumed to be within 5-10 meters for precise ambulance routing.

## 5. Local Execution Instructions
- **Backend**: `cd backend; pip install -r requirements.txt; python main.py`
- **Frontend**: `cd frontend; npm install; npm run dev`
- **Infrastructure**: Requires Redis running on `localhost:6379`.
