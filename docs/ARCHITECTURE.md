# ROADSoS System Architecture

This document provides a comprehensive overview of the ROADSoS technical architecture, detailing how the frontend, backend, and external services interact to provide a high-reliability emergency response platform.

## 🏗️ High-Level Architecture

ROADSoS follows a decoupled client-server architecture:
1. **Client (Frontend)**: A Progressive Web App (PWA) built with React and TypeScript, designed for offline resilience and rapid interaction.
2. **Server (Backend)**: A fast, asynchronous Python API built with FastAPI, acting as a broker for external geospatial data and a hub for real-time WebSocket communication.
3. **Data/Cache Layer**: Redis is utilized for in-memory caching of geospatial data, rate limiting, and Pub/Sub message brokering for live tracking.

---

## 💻 Frontend (Client-Side)

The frontend is engineered to be as lightweight and reliable as possible, utilizing modern Web APIs.

### Tech Stack
*   **Core**: React 18, TypeScript, Vite
*   **Styling & Animation**: Vanilla CSS (CSS Variables for theming), Framer Motion
*   **Mapping**: React-Leaflet (OpenStreetMap tiles)
*   **PWA**: `vite-plugin-pwa` with Workbox for aggressive asset and map-tile caching.

### Key Modules & Workflows
*   **Sensor Integration**: 
    *   `DeviceMotionEvent`: Monitors for high-acceleration events (Shake to SOS).
    *   `SpeechRecognition`: Listens for voice-activated SOS triggers.
    *   `MediaDevices` (Camera): Computes remote photoplethysmography (rPPG) to estimate heart rate.
*   **Offline Capabilities**:
    *   The Service Worker caches the app shell (HTML/JS/CSS).
    *   Local profile data and the last fetched emergency contacts are stored in `localStorage`.
    *   Leaflet map tiles are cached to ensure the map renders even in dead zones.
*   **Localization (`i18n`)**:
    *   Uses `react-i18next`.
    *   Implements an auto-scan feature that cross-references the user's GPS state/province with a predefined map (e.g., Maharashtra -> Marathi) to dynamically switch languages.

---

## ⚙️ Backend (Server-Side)

The backend prioritizes high throughput, concurrency, and fault tolerance.

### Tech Stack
*   **Core**: FastAPI, Python 3.11+
*   **Server**: Uvicorn (ASGI) managed by Gunicorn
*   **State & Pub/Sub**: Redis (via `redis.asyncio`)
*   **Security**: `slowapi` for rate limiting.

### Core Services

#### 1. Geospatial Querying & Mirror Failover
Instead of relying on a single Overpass API mirror, the backend maintains a list of global mirrors.
*   **Parallel Fetching**: Queries are parallelized.
*   **Health Tracking**: If a mirror fails (Timeout/HTTP Error) 3 times, the system temporarily flags it as unstable and routes traffic to the next mirror in the array.
*   **Caching**: Results for a specific `(Lat, Lon, Radius)` coordinate grid are cached in Redis for 5 minutes (`ex=300`) to prevent API abuse and drastically reduce latency for users in the same accident vicinity.

#### 2. Real-Time Live Tracking (WebSockets)
To share location live with emergency contacts:
*   A user hits `/api/create-session` to generate a UUID.
*   The user connects via `ws://.../ws/track/{uuid}`.
*   The backend subscribes the WebSocket to a Redis Pub/Sub channel (`track:{uuid}`).
*   When the user's GPS updates, they push coordinates to the socket. The backend publishes this to Redis, broadcasting it to anyone (like a family member) connected to that same session ID.

#### 3. Security (Instant Access Model)
*   **No Auth Friction**: To ensure victims can use the app instantly, there is no JWT or user database.
*   **Rate Limiting**: To protect the infrastructure from DDoS or Overpass API bans, IP-based rate limiting is enforced on all endpoints using SlowAPI/Redis.

---

## 🔄 Data Flow: Emergency SOS Trigger

1. **Trigger**: User shakes phone, says "SOS", or taps the SOS button.
2. **Safety Window**: Frontend initiates a 3-second haptic countdown.
3. **Action Execution**:
    *   **GPS**: Browser attempts high-accuracy GPS lock. If it times out, it falls back to low-accuracy/cached GPS.
    *   **Live Link**: Frontend creates a Tracking Session via Backend.
    *   **Services**: Frontend fetches nearby hospitals/police via Backend (which queries OSM/Redis).
    *   **Alert**: Frontend prepares a localized SMS containing coordinates and the live-tracking link, launching the native OS dialer/SMS intent.

---

## 🚀 Deployment Architecture

*   **Frontend**: Deployed via Vercel (or similar static hosts) as a fully static SPA.
*   **Backend**: Deployed as a Dockerized container on Render (or AWS/GCP).
*   **Redis**: Hosted via Upstash or a managed Redis instance.

The architecture strictly adheres to a "stateless backend" philosophy. If the FastAPI container restarts, no user data is lost because sessions are transiently stored in Redis, and profile data is isolated to the client's device.
