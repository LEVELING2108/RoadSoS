from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging
import uuid
import json
import os
from typing import Dict, List
from dotenv import load_dotenv
from cachetools import TTLCache
from contextlib import asynccontextmanager

load_dotenv()

# Initialize Cache: 100 max items, 5 minute (300s) expiry
service_cache = TTLCache(maxsize=100, ttl=300)

# Global HTTP client for connection pooling
http_client = httpx.AsyncClient(
    timeout=10.0,
    headers={"User-Agent": "ROADSoS/1.0 (https://github.com/yourusername/roadsos)"}
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: client is already initialized
    yield
    # Shutdown: close the global client
    await http_client.aclose()

app = FastAPI(title="ROADSoS API", lifespan=lifespan)

# Store active tracking sessions: {session_id: [websocket_clients]}
tracking_sessions: Dict[str, List[WebSocket]] = {}
# Store last known location for each session: {session_id: {lat, lon}}
session_locations: Dict[str, dict] = {}

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

@app.post("/api/create-session")
async def create_session():
    session_id = str(uuid.uuid4())
    tracking_sessions[session_id] = []
    return {"session_id": session_id}

@app.websocket("/ws/track/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in tracking_sessions:
        tracking_sessions[session_id] = []
    
    tracking_sessions[session_id].append(websocket)
    
    if session_id in session_locations:
        await websocket.send_json(session_locations[session_id])
    
    try:
        while True:
            data = await websocket.receive_text()
            location_data = json.loads(data)
            session_locations[session_id] = location_data
            
            for client in tracking_sessions[session_id]:
                if client != websocket:
                    try:
                        await client.send_json(location_data)
                    except:
                        pass
    except WebSocketDisconnect:
        if session_id in tracking_sessions:
            tracking_sessions[session_id].remove(websocket)

@app.get("/api/emergency-services")
async def get_emergency_services(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    radius: int = Query(5000, description="Search radius in meters")
):
    """
    Fetch nearby emergency services with performance optimizations.
    """
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{radius}"
    
    if cache_key in service_cache:
        return {"services": service_cache[cache_key]}

    query = f"""
    [out:json][timeout:10];
    (
      nwr(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|doctors|pharmacy|police|fire_station|fuel|bicycle_repair_station|emergency_phone"];
      nwr(around:{radius},{lat},{lon})["shop"~"car_repair|motorcycle_repair|tyres|car|motorcycle"];
      nwr(around:{radius},{lat},{lon})["emergency"~"ambulance_station|tow_truck|phone"];
    );
    out center;
    """

    try:
        response = await http_client.post(OVERPASS_URL, data={"data": query})
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        logging.error(f"Overpass Error: {e}")
        raise HTTPException(status_code=503, detail="Emergency service provider is currently busy. Please try again.")

    elements = data.get("elements", [])
    results = []
    
    for el in elements:
        tags = el.get("tags", {})
        category = tags.get("amenity") or tags.get("shop") or tags.get("emergency") or tags.get("healthcare")
        if not category: continue

        results.append({
            "id": el.get("id"),
            "name": tags.get("name") or f"Nearby {category.replace('_', ' ').title()}",
            "category": category,
            "phone": tags.get("phone") or tags.get("contact:phone") or tags.get("emergency:phone"),
            "lat": el.get("lat") or el.get("center", {}).get("lat"),
            "lon": el.get("lon") or el.get("center", {}).get("lon"),
            "address": tags.get("addr:full") or f"{tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}".strip(),
            "is_recommended": False
        })
    
    service_cache[cache_key] = results
    return {"services": results}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
