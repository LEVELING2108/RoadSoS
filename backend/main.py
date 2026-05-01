from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging
import uuid
import json
import os
import google.generativeai as genai
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-pro')
else:
    logging.warning("GEMINI_API_KEY not found. AI Vision features will be disabled.")
    model = None

app = FastAPI(title="ROADSoS API")

# Store active tracking sessions: {session_id: [websocket_clients]}
tracking_sessions: Dict[str, List[WebSocket]] = {}
# Store last known location for each session: {session_id: {lat, lon}}
session_locations: Dict[str, dict] = {}

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "ROADSoS/1.0 (https://github.com/yourusername/roadsos)"}

@app.post("/api/triage")
async def ai_triage(image: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=503, detail="AI Service is not configured. Please add GEMINI_API_KEY.")
    
    try:
        image_data = await image.read()
        
        prompt = """
        ACT AS A SENIOR EMERGENCY ROOM TRIAGE OFFICER.
        Analyze this image from a road accident or emergency scene.
        1. IDENTIFY IMMEDIATE HAZARDS: (Fire, fuel leaks, unstable vehicles, traffic).
        2. ASSESS INJURY SEVERITY: (Critical, Urgent, Non-Urgent).
        3. PROVIDE STEP-BY-STEP FIRST AID: (Clear, actionable instructions for a bystander).
        4. SPECIFY THE TYPE OF FACILITY NEEDED: (Trauma Center, Burn Unit, General Hospital).
        
        KEEP YOUR RESPONSE CONCISE, ACTIONABLE, AND CALM. USE MARKDOWN FOR FORMATTING.
        """
        
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_data}
        ])
        
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

@app.get("/api/emergency-services")
async def get_emergency_services(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    radius: int = Query(5000, description="Search radius in meters"),
    context: str = Query(None, description="Triage context for AI recommendation")
):
    """
    Fetch nearby emergency services and optionally rank them using AI based on context.
    """
    query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:{radius},{lat},{lon});
      way["amenity"="hospital"](around:{radius},{lat},{lon});
      node["amenity"="clinic"](around:{radius},{lat},{lon});
      node["amenity"="doctors"](around:{radius},{lat},{lon});
      node["amenity"="pharmacy"](around:{radius},{lat},{lon});
      node["amenity"="police"](around:{radius},{lat},{lon});
      node["amenity"="fire_station"](around:{radius},{lat},{lon});
      node["shop"="car_repair"](around:{radius},{lat},{lon});
      node["shop"="motorcycle_repair"](around:{radius},{lat},{lon});
      node["shop"="tyres"](around:{radius},{lat},{lon});
      node["shop"="car"](around:{radius},{lat},{lon});
      node["shop"="motorcycle"](around:{radius},{lat},{lon});
      node["emergency"="ambulance_station"](around:{radius},{lat},{lon});
      node["emergency"="tow_truck"](around:{radius},{lat},{lon});
      node["amenity"="fuel"](around:{radius},{lat},{lon});
      node["amenity"="bicycle_repair_station"](around:{radius},{lat},{lon});
      node["emergency"="phone"](around:{radius},{lat},{lon});
    );
    out center;
    """

    async with httpx.AsyncClient(headers=HEADERS) as client:
        try:
            response = await client.post(OVERPASS_URL, data={"data": query}, timeout=30.0)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            logging.error(f"Error fetching data from Overpass: {e}")
            raise HTTPException(status_code=503, detail="Emergency services provider unavailable.")

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
            
    # AI Recommendation Engine
    if context and model and results:
        try:
            service_names = [r["name"] for r in results[:10]]
            recommend_prompt = f"""
            Triage Context: {context}
            Nearby Services: {', '.join(service_names)}
            
            Based on the triage context, which ONE of these services is the BEST fit for the patient's immediate needs? 
            Respond ONLY with the EXACT name of the service from the list. If none fit, respond with 'None'.
            """
            ai_res = model.generate_content(recommend_prompt)
            recommended_name = ai_res.text.strip()
            
            for r in results:
                if r["name"] == recommended_name:
                    r["is_recommended"] = True
        except Exception as e:
            logging.error(f"AI Recommendation Error: {e}")

    return {"services": results}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
