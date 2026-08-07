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

## ✨ Latest Updates (August 2026)

### 🧠 1. High-Performance Algorithmic Core (DSA Engine)
- **2D KD-Tree Spatial Indexing ($O(\log N)$)**: Replaced flat array processing with an in-memory k-dimensional tree for sub-millisecond nearest emergency facility lookup and spatial range queries.
- **Bounded Max-Heap Top-K Selection ($O(N \log K)$)**: Integrated priority queue candidate selection ($K=25$) on both client and server to eliminate full-array Timsort overhead ($O(N \log N)$).
- **Geohash Grid Caching ($O(1)$)**: Encodes coordinates into 6-character Base32 Geohashes (Z-Order curves) for $O(1)$ spatial hashing and Redis cache keying (`svc:geohash_radius`).
- **Prefix Trie Autocomplete ($O(L)$)**: Trie data structure for $O(L)$ search-as-you-type prefix lookup across 25 supported regional languages.
- **Probabilistic Bloom Filter ($O(1)$)**: BitSet-based Bloom filter for instant set membership verification before triggering external API requests.

### ⚡ 2. Ultra-High Reliability & Memory Leak Elimination
- **Hardware Resource Cleanup**: Streamlined the rPPG Vitals Monitor and Geolocation Watcher lifecycle to automatically release active camera `MediaStream` video tracks and cancel animation frames upon toggle or component unmount.
- **Strict WebSocket Routing**: Cleaned WebSocket URL host parsing to remove trailing slashes, ensuring strict compliance across Nginx, Cloudflare, and Docker reverse proxies.
- **Defensive Geolocation & Haversine Math**: Added domain clamping to Haversine distance calculations (`a = min(1.0, max(0.0, a))`) to eliminate floating-point edge-case crashes, alongside explicit `is not None` handling for equator/prime-meridian (`0.0`) coordinates.

### 📳 3. Shake to Activate SOS & Voice SOS
- **Gesture-Based Triggers**: Added support for motion-activated SOS calls. Users can firmly shake their device to trigger an emergency session.
- **3-Second Safety Window**: To prevent false alarms, a high-priority countdown overlay appears with haptic feedback, allowing users to cancel accidental triggers.
- **Cross-Platform Compatibility**: Optimized for both Android and iOS devices using the `DeviceMotionEvent` API.

### 🛡️ 4. "Instant Access" Security Model
- **Zero-Friction Emergency Use**: Removed user authentication/login requirements. Victims can access all life-saving features instantly without remembering passwords.
- **Backend Rate Limiting**: Integrated `SlowApi` with Redis to protect the infrastructure from abuse while maintaining open access for legitimate users.
- **Enhanced Privacy**: User profile data (Name, Blood Group, Medical Notes) is stored strictly on the local device, ensuring absolute privacy.

### 🌍 5. Regional Language "Scan"
- **GPS-Based Localization**: The app now detects the user's specific state (e.g., Tamil Nadu, Maharashtra) and automatically suggests or switches to the primary regional language.
- **Scheduled Languages Support**: Full support for Indian Scheduled Languages (Hindi, Tamil, Telugu, Marathi, etc.) to assist non-English speakers during crises.

### 🛠️ 6. Advanced Parallel Mirror Failover
- **Fast Mirror Timeout**: Reduced mirror connection timeouts to 10s (backend) and 3.5s (client fallback race) to fail over seamlessly during OpenStreetMap API congestion.
- **Redis Connection Guard**: Pub/Sub listeners now cleanly unsubscribe and close on WebSocket disconnect without throwing cancelled task exceptions.

---

## ✨ Core Features

### 🚑 Golden Hour Rescue Coordination
- **Trauma Center Prioritization**: Specialized accident care facilities are prioritized and highlighted with pulsing "Trauma Center" badges.
- **High-Efficiency Parallel Search**: Backend splits queries into specific categories and executes them concurrently across multiple global mirrors.
- **Real-time Tracking**: WebSocket-powered live location sharing allows victims to broadcast their movements to rescue teams via Redis Pub/Sub.

### 📋 Proactive Bystander Support
- **Bystander Emergency Protocol**: A standalone, proactive 3-step checklist (Secure Scene, Assess, Coordinate) to guide first responders.
- **GPS Coordination**: One-tap location copying to accurately relay coordinates to emergency dispatchers.

### 📶 Robust Offline Functionality
- **Map Tile Caching**: PWA implementation pre-caches OpenStreetMap tiles, ensuring the map remains functional even in zero-network zones.
- **Geospatial Cache Headers**: Redis caching with rounded coordinate grids (~110m) to ensure nearby users share the same ultra-fast responses.

---

## 📚 Documentation

For a deep dive into the system's inner workings, refer to our end-to-end documentation:
- 🏗️ [**System Architecture**](./docs/ARCHITECTURE.md): Detailed breakdown of the decoupled frontend/backend, data flow, failover systems, and deployment strategy.
- 📡 [**API Reference**](./docs/API_REFERENCE.md): Comprehensive documentation of the FastAPI REST endpoints, WebSocket connections, rate limits, and expected payloads.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State/Animation**: Framer Motion & Lucide Icons
- **Mapping**: Leaflet with Workbox-powered Tile Caching
- **PWA**: Fully installable as a mobile app with offline support

### Backend
- **Engine**: FastAPI (Python 3.11+)
- **Security**: SlowApi Rate Limiting (Redis-backed)
- **Real-time**: WebSockets with Redis Pub/Sub
- **Cache**: Redis (Geospatial-hashed transient storage)

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
- **Innovation**: Gesture-based SOS triggers, regional language scanning, and parallel search architecture.

---

© 2026 ROADSoS Global Network. Built for safety.
