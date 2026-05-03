from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging
import uuid
import json
import os
from google import genai
from google.genai import types
from typing import Dict, List
from dotenv import load_dotenv
from cachetools import TTLCache

load_dotenv()

# Initialize Cache: 100 max items, 5 minute (300s) expiry
service_cache = TTLCache(maxsize=100, ttl=300)

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    client = genai.Client(api_key=GENAI_API_KEY)
else:
    logging.warning("GEMINI_API_KEY not found. AI Vision features will be disabled.")
    client = None

app = FastAPI(title="ROADSoS API")

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
HEADERS = {"User-Agent": "ROADSoS/1.0 (https://github.com/yourusername/roadsos)"}

@app.post("/api/triage")
async def ai_triage(language: str = Query("en", description="Preferred response language"), image: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=503, detail="AI Service is not configured. Please add GEMINI_API_KEY.")
    
    try:
        image_data = await image.read()
        
        prompt = f"""
        ACT AS A SENIOR EMERGENCY ROOM TRIAGE OFFICER.
        Analyze this image from a road accident or emergency scene.
        1. IDENTIFY IMMEDIATE HAZARDS: (Fire, fuel leaks, unstable vehicles, traffic).
        2. ASSESS INJURY SEVERITY: (Critical, Urgent, Non-Urgent).
        3. PROVIDE STEP-BY-STEP FIRST AID: (Clear, actionable instructions for a bystander).
        4. SPECIFY THE TYPE OF FACILITY NEEDED: (Trauma Center, Burn Unit, General Hospital).
        
        IMPORTANT: YOUR ENTIRE RESPONSE MUST BE IN {language.upper()}.
        KEEP YOUR RESPONSE CONCISE, ACTIONABLE, AND CALM. USE MARKDOWN FOR FORMATTING.
        """
        
        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ]
        )
        
        return {"analysis": response.text}
    except Exception as e:
        logging.error(f"AI Triage Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze image with AI.")

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
    
    # If we already have a location, send it immediately to the new client
    if session_id in session_locations:
        await websocket.send_json(session_locations[session_id])
    
    try:
        while True:
            # Receive coordinate updates from the user
            data = await websocket.receive_text()
            location_data = json.loads(data)
            
            # Store last known location
            session_locations[session_id] = location_data
            
            # Broadcast to all other clients in this session
            for client in tracking_sessions[session_id]:
                if client != websocket:
                    try:
                        await client.send_json(location_data)
                    except:
                        pass
    except WebSocketDisconnect:
        tracking_sessions[session_id].remove(websocket)
        if not tracking_sessions[session_id]:
            # Clean up if no one is watching/streaming
            # We keep locations for a while, but in a real app we'd add TTL
            pass

import asyncio

# ... (imports and cache remains same) ...

@app.get("/api/emergency-services")
async def get_emergency_services(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    radius: int = Query(5000, description="Search radius in meters"),
    context: str = Query(None, description="Triage context for AI recommendation")
):
    """
    Fetch nearby emergency services with extreme performance.
    Returns results immediately from cache or optimized Overpass pass.
    """
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{radius}"
    
    if cache_key in service_cache:
        logging.info("Serving from cache")
        results = service_cache[cache_key]
        # Return a copy to avoid mutating the cache
        return {"services": await apply_ai_to_results(context, results.copy())}

    # Optimized 'nwr' (Node, Way, Relation) query for single-pass performance
    query = f"""
    [out:json][timeout:10];
    (
      nwr(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|doctors|pharmacy|police|fire_station|fuel|bicycle_repair_station|emergency_phone"];
      nwr(around:{radius},{lat},{lon})["shop"~"car_repair|motorcycle_repair|tyres|car|motorcycle"];
      nwr(around:{radius},{lat},{lon})["emergency"~"ambulance_station|tow_truck|phone"];
    );
    out center;
    """

    async with httpx.AsyncClient(headers=HEADERS) as client:
        try:
            # Reduced timeout for snappier failure/retry
            response = await client.post(OVERPASS_URL, data={"data": query}, timeout=15.0)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            logging.error(f"Overpass Error: {e}")
            raise HTTPException(status_code=503, detail="Provider delay. Try again.")

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
    return {"services": await apply_ai_to_results(context, results)}

async def apply_ai_to_results(context, results):
    """
    Applies AI recommendation without blocking the main event loop.
    """
    if not context or not client or not results:
        return results

    try:
        # Run the blocking AI call in a separate thread pool
        service_names = [r["name"] for r in results[:15]]
        recommend_prompt = f"Triage Context: {context}\nNearby: {', '.join(service_names)}\nWhich is BEST? Respond ONLY with the EXACT name."
        
        # Use asyncio.to_thread to prevent blocking the event loop
        response = await asyncio.to_thread(client.models.generate_content, model="gemini-1.5-pro", contents=recommend_prompt)
        recommended_name = response.text.strip()
        
        for r in results:
            if r["name"] == recommended_name:
                r["is_recommended"] = True
    except Exception as e:
        logging.error(f"AI Recommendation async error: {e}")
    
    return results

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
