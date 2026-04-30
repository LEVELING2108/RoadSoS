# ROADSoS - Global Emergency & Roadside Assistance

ROADSoS is a high-performance, location-based emergency tool designed to provide immediate access to critical services during road accidents or vehicle breakdowns. Built as a Progressive Web App (PWA), it ensures reliability even in low-connectivity areas.

## 🚀 Key Features

### 🆘 Intelligent SOS Dashboard
- **One-Tap Search:** Instantly find nearby emergency services based on precise GPS coordinates.
- **Visual Location:** Pulsing user location marker with real-time latitude/longitude display for easy sharing with responders.
- **Smart SMS Alerts:** Send your exact Google Maps location to up to 3 emergency contacts with one tap.

### 🏥 Categorized Emergency Search
- **Medical:** Hospitals, Clinics, Doctors, Pharmacies, and Ambulance Stations.
- **Security:** Police Stations, Fire Stations, and Emergency Phones.
- **Repairs & Rescue:** Car/Motorcycle repair shops, Puncture (Tyre) shops, Showrooms, Towing services, and Fuel stations.

### 📋 Comprehensive User Profile (Medical ID)
- **Personal Details:** Store your Name, Blood Group, and critical Medical Notes (allergies, conditions) directly on your device.
- **Privacy First:** All profile data is stored locally using `LocalStorage`—no data is sent to external servers.

### 📱 Responsive & Adaptive UI
- **PC Version:** Optimized multi-column layout with a side-by-side service list and interactive map.
- **Mobile Version:** Streamlined, focus-driven UI with smooth transitions between list and map views.
- **Dark/Light Mode:** Seamlessly switch themes for better visibility in any lighting condition.

### 📶 Offline-Ready (PWA)
- **Global Support:** Queries the global OpenStreetMap (Overpass API) database.
- **Local Caching:** Caches application shell and recent search results for access in dead zones.
- **First Aid Guides:** Offline-accessible, step-by-step instructions for CPR, bleeding, choking, burns, and fractures.

## 🛠 Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Lucide Icons.
- **Mapping:** Leaflet, React-Leaflet (OpenStreetMap).
- **Backend:** FastAPI (Python), HTTPX (Async Proxy).
- **Data Source:** OpenStreetMap (Overpass API).

## 🛠 Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js 18+

### 1. Backend Setup
```bash
# From the root directory
pip install fastapi uvicorn httpx python-dotenv
python backend/main.py
```
Backend runs on `http://localhost:8000`.

### 2. Frontend Setup
```bash
# From the root directory
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

## 📖 Usage
1. **Profile Setup:** Open the **User Profile** icon and enter your medical details and emergency contacts.
2. **Location Access:** Allow location permissions for the app to function.
3. **Trigger SOS:** Tap the central **SOS** button to fetch all nearby services within a 5km radius.
4. **Browse Categories:** Switch between **Medical**, **Security**, and **Repairs** to find specific help.
5. **Direct Action:** Use the **CALL** button for immediate contact or **MAP** for turn-by-turn navigation via Google Maps.

## 🛡 Security & Privacy
ROADSoS is designed with privacy at its core. Your GPS location is only sent to the Overpass API during an active SOS request, and your personal profile details never leave your device.

---
*ROADSoS GLOBAL EMERGENCY NETWORK © 2026*
