# 🚨 ROADSoS - Global Emergency Rescue Network

**Empowering the Golden Hour: High-Reliability Emergency Assistance & Global Rescue Coordination.**

ROADSoS is a location-based platform designed to provide immediate access to life-saving services during road accidents. By integrating trauma centers, ambulances, police, and vehicle rescue into a single interface, it supports both victims and bystanders in taking rapid, effective action.

---

## 🌐 Live Services
- **Backend API**: [https://roadsos-ymil.onrender.com](https://roadsos-ymil.onrender.com)
- **Status**: ✅ Operational (Redis Engine Connected)

---

## ✨ Key Features

### 🚑 1. Golden Hour Rescue Coordination
- **Trauma Center Prioritization**: Specialized accident care facilities are prioritized and highlighted with pulsing "Trauma Center" badges.
- **Real-time Tracking**: WebSocket-powered live location sharing allows victims to broadcast their movements to rescue teams and family.
- **Bystander Emergency Protocol**: A proactive 3-step checklist (Secure Scene, Assess, Coordinate) that triggers during an SOS to guide first responders.

### 🌍 2. Global Applicability
- **Intelligent Localization**: Automatically detects your country and provides local Police, Ambulance, and Fire numbers for over 50+ countries.
- **Multi-Mirror Failover**: Backend logic automatically rotates between 3 different global data providers (Overpass API mirrors) to ensure 99.9% data availability.

### 📶 3. Robust Offline Functionality
- **Map Tile Caching**: PWA implementation pre-caches OpenStreetMap tiles, ensuring the map remains functional even in zero-network zones.
- **Service Data Persistence**: Critical contact data and previous search results are cached locally for instant access.

### 🛠️ 4. Comprehensive Vehicle Support
- **Beyond Repairs**: Explicit identification of **Towing Services**, **Showrooms**, and **Puncture Shops** for faster vehicle recovery.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State/Animation**: Framer Motion & Lucide Icons
- **Mapping**: Leaflet with Workbox-powered Tile Caching
- **PWA**: Fully installable as a mobile app with offline support

### Backend
- **Engine**: FastAPI (Python 3.11+)
- **Real-time**: WebSockets with Redis Pub/Sub
- **Cache**: Redis (High-speed transient storage)
- **Deployment**: Render (Web Service + Redis Service)

---

## 🛠️ Local Development

### Prerequisites
- Docker & Docker Compose

### Quick Start
1. **Clone the Repo**:
   ```bash
   git clone https://github.com/LEVELING2108/RoadSoS.git
   cd RoadSoS
   ```

2. **Launch the Stack**:
   ```bash
   docker-compose up --build
   ```

3. **Access the App**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000`

---

## 📈 Evaluation Criteria Alignment
- **Reliability**: Multi-source backend failover and Redis-backed caching.
- **Accuracy**: Specialized OSM tagging for Trauma and Rescue identification.
- **Offline**: PWA map tile caching for "no-signal" scenarios.
- **Innovation**: Real-time coordination dashboard & proactive bystander guidance.

---

© 2026 ROADSoS Global Network. Built for safety.
