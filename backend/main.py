from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging
import uuid
import json
import os
import asyncio
import redis.asyncio as redis
from typing import Dict, List
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Global HTTP client for connection pooling
http_client = httpx.AsyncClient(
    timeout=10.0,
    headers={"User-Agent": "ROADSoS/1.0 (https://github.com/yourusername/roadsos)"}
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: client is already initialized
    # Test redis connection
    try:
        await redis_client.ping()
        logging.info("Connected to Redis")
    except Exception as e:
        logging.error(f"Redis Connection Error: {e}")
    
    yield
    # Shutdown: close the global clients
    await http_client.aclose()
    await redis_client.close()

app = FastAPI(title="ROADSoS API", lifespan=lifespan)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# List of Overpass API mirrors for high availability
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter"
]

@app.post("/api/create-session")
async def create_session():
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

async def redis_listener(websocket: WebSocket, session_id: str):
    """Listens for updates from Redis Pub/Sub and sends them to the WebSocket."""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"track:{session_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except Exception as e:
        logging.error(f"Redis Listener Error: {e}")
    finally:
        await pubsub.unsubscribe(f"track:{session_id}")
        await pubsub.close()

@app.websocket("/ws/track/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    # Send last known location if available
    last_loc = await redis_client.get(f"loc:{session_id}")
    if last_loc:
        await websocket.send_text(last_loc)
    
    # Start the background task to listen for Redis updates
    listener_task = asyncio.create_task(redis_listener(websocket, session_id))
    
    try:
        while True:
            data = await websocket.receive_text()
            # Update last known location in Redis (Expires in 1 hour)
            await redis_client.set(f"loc:{session_id}", data, ex=3600)
            # Broadcast to other clients via Redis Pub/Sub
            await redis_client.publish(f"track:{session_id}", data)
    except WebSocketDisconnect:
        logging.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logging.error(f"WebSocket Error: {e}")
    finally:
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass

async def fetch_from_overpass(query: str):
    """
    Attempts to fetch data from Overpass API mirrors with failover logic.
    """
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            logging.info(f"Attempting fetch from {endpoint}")
            response = await http_client.post(endpoint, data={"data": query}, timeout=15.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logging.error(f"Error fetching from {endpoint}: {e}")
            continue
    raise HTTPException(status_code=503, detail="All emergency data providers are currently busy. Please try again.")

@app.get("/api/emergency-services")
async def get_emergency_services(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    radius: int = Query(5000, description="Search radius in meters")
):
    """
    Fetch nearby emergency services with Redis caching, Trauma prioritization, and Failover.
    """
    cache_key = f"svc:{round(lat, 3)}_{round(lon, 3)}_{radius}"
    
    # Try fetching from Redis cache
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        return {"services": json.loads(cached_data)}

    # Enhanced query to include showrooms and specific trauma/emergency tags
    query = f"""
    [out:json][timeout:15];
    (
      // Priority 1: Trauma Centers and Emergency Hospitals
      nwr(around:{radius},{lat},{lon})["amenity"="hospital"]["emergency"="yes"];
      nwr(around:{radius},{lat},{lon})["healthcare:speciality"~"trauma|emergency"];
      
      // Priority 2: General Medical
      nwr(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|doctors|pharmacy"];
      
      // Priority 3: Police & Fire
      nwr(around:{radius},{lat},{lon})["amenity"~"police|fire_station"];
      
      // Priority 4: Vehicle Rescue & Support (Including Showrooms & Tyres)
      nwr(around:{radius},{lat},{lon})["shop"~"car_repair|motorcycle_repair|tyres|car|motorcycle"];
      nwr(around:{radius},{lat},{lon})["emergency"~"ambulance_station|tow_truck"];
      nwr(around:{radius},{lat},{lon})["amenity"="fuel"];
    );
    out center;
    """

    data = await fetch_from_overpass(query)
    elements = data.get("elements", [])
    results = []
    
    for el in elements:
        tags = el.get("tags", {})
        amenity = tags.get("amenity")
        shop = tags.get("shop")
        emergency = tags.get("emergency")
        speciality = tags.get("healthcare:speciality", "")
        
        category = amenity or shop or emergency or tags.get("healthcare")
        if not category: continue

        # Proactive Trauma identification
        is_trauma = "trauma" in speciality.lower() or tags.get("emergency") == "yes"
        
        # Highlighting Showrooms vs Repairs
        is_showroom = shop in ["car", "motorcycle"]

        results.append({
            "id": el.get("id"),
            "name": tags.get("name") or f"Nearby {category.replace('_', ' ').title()}",
            "category": category,
            "type": "trauma_center" if is_trauma else ("showroom" if is_showroom else category),
            "phone": tags.get("phone") or tags.get("contact:phone") or tags.get("emergency:phone"),
            "lat": el.get("lat") or el.get("center", {}).get("lat"),
            "lon": el.get("lon") or el.get("center", {}).get("lon"),
            "address": tags.get("addr:full") or f"{tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}".strip(),
            "is_recommended": is_trauma
        })
    
    # Sort results to put recommended (trauma) at the top
    results.sort(key=lambda x: x["is_recommended"], reverse=True)
    
    # Store in Redis with 5-minute expiry
    await redis_client.set(cache_key, json.dumps(results), ex=300)
    return {"services": results}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
