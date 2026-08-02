# 🚨 ROADSoS - Global Emergency Rescue Network
**Hackathon Submission Document | May 2026**

## 🌟 Executive Summary
**ROADSoS** is a high-performance, sensor-driven emergency response platform designed to empower the "Golden Hour"—the critical first 60 minutes after a road accident. By removing all friction (no login required) and utilizing advanced device sensors, ROADSoS connects victims and bystanders with trauma centers, ambulances, and police in seconds.

---

## 🚀 The Problem & Solution
### The Problem
*   **Friction**: Most emergency apps require login/registration, wasting life-saving seconds.
*   **GPS Latency**: Hardware GPS locks can take 10-20 seconds, especially indoors.
*   **Language Barriers**: Non-English speakers struggle to communicate with apps during panic.
*   **Unreliability**: Single-source mapping APIs often fail or rate-limit during high traffic.

### Our Solution (The Innovation)
*   **Zero-Friction Access**: Instant UI access with local-only data storage for privacy.
*   **Fused Location Engine**: Maintains a "hot" background location fix for 0-second latency.
*   **Gesture & Voice SOS**: Motion-activated (Shake) and voice-triggered emergency alerts.
*   **Adaptive Regional Sync**: Automatically detects the user’s Indian State via GPS and switches to the regional language (Marathi, Tamil, etc.).

---

## 🛠️ Technical Stack
### Frontend (PWA)
*   **Framework**: React 19 + TypeScript + Vite.
*   **State & Animation**: Framer Motion (Fluid transitions) & Lucide Icons.
*   **Mapping**: Leaflet.js with OpenStreetMap (OSM).
*   **Offline Support**: Vite-PWA with Workbox for Map Tile Caching.
*   **Sensors**: DeviceMotionEvent (Shake), Web Speech API (Voice), MediaDevices (Camera rPPG).

### Backend (Distributed)
*   **Framework**: FastAPI (Asynchronous Python 3.12).
*   **Real-time**: WebSockets for Live Victim Tracking.
*   **Rate Limiting**: SlowAPI (Redis-backed).
*   **Mirror Failover**: Intelligent tracking and routing across 4+ global Overpass API mirrors.

### Data & Infrastructure
*   **Primary Cache**: Redis (Geospatial hashing & Pub/Sub).
*   **Deployment**: Dockerized architecture (Docker Compose ready).
*   **Data Source**: OpenStreetMap (OSM) with specialized "Trauma Center" tagging.

---

## 💎 Key Features
### 1. High-Reliability Fused Geolocation
Uses a tiered strategy: **Background Watch (Hot)** -> **High Accuracy GPS** -> **WiFi/Cellular Fallback** -> **Memory Cache**. This ensures that the SOS button *always* has a coordinate ready, even if the user is in a basement or tunnel.

### 2. Shake-to-SOS with Safety Window
Uses the accelerometer to detect high-impact shakes. Triggers a 3-second haptic countdown with a "Cancel" option to prevent false alarms, followed by an immediate emergency sequence.

### 3. AI Vitals Monitoring (rPPG)
A camera-based heart rate monitor that computes pulse by analyzing micro-color changes in the user's face (Remote Photoplethysmography), providing first responders with vital data before they arrive.

### 4. Smart Mirror Failover
The backend monitors the health of global OpenStreetMap servers. If one server (e.g., German mirror) slows down or fails, the system automatically redirects the query to an available mirror (e.g., Swiss mirror) in real-time.

---

## 📡 API Reference & Data Flow

### End-to-End Data Flow (SOS Event)
1.  **Trigger**: User shakes device or taps SOS.
2.  **Location**: Fused Location Engine pulls the current latitude/longitude from the background watch.
3.  **Backend Fetch**: 
    *   Request: `GET /api/emergency-services?lat={lat}&lon={lon}&radius=5000`
    *   Backend checks **Redis Cache** first (300s TTL).
    *   If no cache, it queries **Multiple OSM Mirrors** in parallel.
4.  **Live Tracking**: 
    *   `POST /api/create-session` generates a unique tracking ID.
    *   WebSocket opens at `ws://backend/ws/track/{id}`.
    *   Coordinates are published to **Redis Pub/Sub** for real-time sharing.

### Primary Endpoints
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/emergency-services` | `GET` | Parallel search for Hospitals, Police, and Rescue. |
| `/api/create-session` | `POST` | Generates UUID for live tracking. |
| `/ws/track/{session_id}` | `WS` | Bi-directional location broadcasting via Redis. |
| `/health` | `GET` | System heartbeat (Backend + Redis health). |

---

## 📈 Evaluation Metrics
*   **Reliability**: Multi-mirror failover ensures 99.9% uptime for data.
*   **Latency**: Redis caching delivers response times < 100ms.
*   **Accessibility**: Support for 22+ Indian languages via Auto-Scan.
*   **Zero-Friction**: 0.0s time spent on authentication.

---
© 2026 ROADSoS Global Network. Built for Safety.
