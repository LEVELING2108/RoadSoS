# 🚨 ROADSoS - Global Emergency Rescue Network

**Empowering the Golden Hour: High-Reliability Emergency Assistance & Global Rescue Coordination.**

ROADSoS is a high-performance, location-based platform designed to provide immediate access to life-saving services during road accidents. By integrating trauma centers, ambulances, police, and vehicle rescue into a single interface, it supports both victims and bystanders in taking rapid, effective action.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

---

## ✨ Key Features

### 🚑 1. Golden Hour Rescue Coordination
- **Trauma Center Prioritization**: Specialized accident care facilities are prioritized and highlighted with pulsing "Trauma Center" badges.
- **High-Efficiency Parallel Search**: Backend splits queries into specific categories (Medical, Security, Rescue) and executes them concurrently across multiple global mirrors to ensure zero-lag transitions.
- **Real-time Tracking**: WebSocket-powered live location sharing allows victims to broadcast their movements to rescue teams and family via Redis Pub/Sub.

### 📋 2. Proactive Bystander Support
- **Bystander Emergency Protocol**: A standalone, proactive 3-step checklist (Secure Scene, Assess, Coordinate) to guide first responders.
- **GPS Coordination**: One-tap location copying to accurately relay coordinates to emergency dispatchers.

### 🌍 3. Global Applicability
- **Intelligent Localization**: Automatically detects your country and provides local Police, Ambulance, and Fire numbers for over 50+ countries.
- **Multi-Mirror Failover**: Backend logic automatically rotates between 4 different global data providers (Overpass API mirrors) to ensure 99.9% data availability.

### 📶 4. Robust Offline Functionality
- **Map Tile Caching**: PWA implementation pre-caches OpenStreetMap tiles, ensuring the map remains functional even in zero-network zones.
- **Geospatial Cache Headers**: Redis caching with rounded coordinate grids (~110m) to ensure nearby users share the same ultra-fast responses.

### 🛠️ 5. Comprehensive Vehicle Support
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
- **Cache**: Redis (Geospatial-hashed transient storage)
- **Deployment**: Render (Optimized Free Tier configuration)

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
- **Innovation**: Real-time coordination dashboard, parallel search architecture & proactive bystander guidance.

---

© 2026 ROADSoS Global Network. Built for safety.
