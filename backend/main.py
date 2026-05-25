from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
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

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Rate Limiter Configuration
limiter = Limiter(key_func=get_remote_address, storage_uri=REDIS_URL)

# Global HTTP client with robust headers
http_client = httpx.AsyncClient(
    timeout=20.0,
    headers={
        "User-Agent": "ROADSoS/1.0 (https://github.com/LEVELING2108/RoadSoS)",
        "Accept": "application/json"
    }
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Attempting to connect to Redis at: {REDIS_URL}")
    try:
        await redis_client.ping()
        logger.info(f"Successfully connected to Redis at {REDIS_URL}")
    except Exception as e:
        logger.error(f"Redis Connection Error ({REDIS_URL}): {e}")
    
    yield
    await http_client.aclose()
    await redis_client.close()

app = FastAPI(title="ROADSoS API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter"
]

@app.post("/api/create-session")
@limiter.limit("5/minute")
async def create_session(request: Request):
    return {"session_id": str(uuid.uuid4())}

async def redis_listener(websocket: WebSocket, session_id: str):
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"track:{session_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except Exception as e:
        logger.error(f"Redis Listener Error: {e}")
    finally:
        await pubsub.unsubscribe(f"track:{session_id}")
        await pubsub.close()

@app.websocket("/ws/track/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    last_loc = await redis_client.get(f"loc:{session_id}")
    if last_loc:
        await websocket.send_text(last_loc)
    
    listener_task = asyncio.create_task(redis_listener(websocket, session_id))
    try:
        while True:
            data = await websocket.receive_text()
            await redis_client.set(f"loc:{session_id}", data, ex=3600)
            await redis_client.publish(f"track:{session_id}", data)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass

async def fetch_parallel(query: str, endpoint_idx: int):
    endpoint = OVERPASS_ENDPOINTS[endpoint_idx % len(OVERPASS_ENDPOINTS)]
    try:
        logger.info(f"Querying {endpoint}...")
        response = await http_client.post(endpoint, data={"data": query})
        if response.status_code == 200:
            elements = response.json().get("elements", [])
            logger.info(f"Success from {endpoint}: {len(elements)} items")
            return elements
        logger.error(f"Fail from {endpoint}: {response.status_code}")
        return []
    except Exception as e:
        logger.error(f"Error from {endpoint}: {str(e)}")
        return []

@app.get("/api/emergency-services")
@limiter.limit("10/minute")
async def get_emergency_services(
    request: Request,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius: int = Query(5000, description="Radius")
):
    geo_key = f"svc:{round(lat, 3)}_{round(lon, 3)}_{radius}"
    cached_data = await redis_client.get(geo_key)
    if cached_data:
        return {"services": json.loads(cached_data)}

    # SIMPLIFIED QUERIES FOR MAX COMPATIBILITY
    queries = [
        f'[out:json][timeout:15];nwr(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|doctors|pharmacy"];out center;',
        f'[out:json][timeout:15];nwr(around:{radius},{lat},{lon})["amenity"~"police|fire_station"];out center;',
        f'[out:json][timeout:15];nwr(around:{radius},{lat},{lon})["shop"~"car_repair|tyres|car|motorcycle"];out center;'
    ]

    tasks = [fetch_parallel(q, i) for i, q in enumerate(queries)]
    results_list = await asyncio.gather(*tasks)
    all_elements = [item for sublist in results_list for item in sublist]
    
    if not all_elements:
        logger.warning("No parallel results. Trying single robust mirror.")
        agg = f'[out:json][timeout:25];nwr(around:{radius},{lat},{lon})["amenity"~"hospital|police|fire_station"];out center;'
        all_elements = await fetch_parallel(agg, 1)

    if not all_elements:
        raise HTTPException(status_code=503, detail="Emergency providers are currently unresponsive. Please retry.")

    final_results = []
    seen_ids = set()
    for el in all_elements:
        if el["id"] in seen_ids: continue
        seen_ids.add(el["id"])
        tags = el.get("tags", {})
        category = tags.get("amenity") or tags.get("shop") or tags.get("emergency") or tags.get("healthcare")
        if not category: continue
        
        is_trauma = "trauma" in tags.get("healthcare:speciality", "").lower() or tags.get("emergency") == "yes"
        is_showroom = tags.get("shop") in ["car", "motorcycle"]
        
        final_results.append({
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
    
    final_results.sort(key=lambda x: x["is_recommended"], reverse=True)
    await redis_client.set(geo_key, json.dumps(final_results), ex=300)
    return {"services": final_results}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
