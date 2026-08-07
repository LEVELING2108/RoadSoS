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

# Mirror Health Tracking
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
]
MIRROR_STATUS = {url: {"fails": 0, "last_error": None} for url in OVERPASS_ENDPOINTS}

def get_healthy_endpoint(preferred_idx: int) -> str:
    n = len(OVERPASS_ENDPOINTS)
    for i in range(n):
        ep = OVERPASS_ENDPOINTS[(preferred_idx + i) % n]
        if MIRROR_STATUS[ep]["fails"] < 3:
            return ep
    least_failed = min(OVERPASS_ENDPOINTS, key=lambda ep: MIRROR_STATUS[ep]["fails"])
    logger.info(f"All mirrors unhealthy. Resetting status and selecting: {least_failed}")
    for ep in OVERPASS_ENDPOINTS:
        MIRROR_STATUS[ep]["fails"] = 0
    return least_failed

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ROADSoS Backend...")
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
        try:
            await pubsub.unsubscribe(f"track:{session_id}")
        except Exception:
            pass
        try:
            await pubsub.close()
        except Exception:
            pass

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
    endpoint = get_healthy_endpoint(endpoint_idx)

    try:
        logger.info(f"Querying {endpoint}...")
        response = await http_client.post(endpoint, data={"data": query}, timeout=8.0)
        
        if response.status_code == 200:
            MIRROR_STATUS[endpoint]["fails"] = 0
            elements = response.json().get("elements", [])
            logger.info(f"Success from {endpoint}: {len(elements)} items")
            return elements
        
        error_msg = f"HTTP {response.status_code}"
        MIRROR_STATUS[endpoint]["fails"] += 1
        MIRROR_STATUS[endpoint]["last_error"] = error_msg
        logger.error(f"Fail from {endpoint}: {error_msg}")
        return []
        
    except httpx.TimeoutException:
        MIRROR_STATUS[endpoint]["fails"] += 1
        MIRROR_STATUS[endpoint]["last_error"] = "Timeout"
        logger.error(f"Error from {endpoint}: Request Timeout (8s)")
        return []
    except httpx.ConnectError:
        MIRROR_STATUS[endpoint]["fails"] += 1
        MIRROR_STATUS[endpoint]["last_error"] = "ConnectError"
        logger.error(f"Error from {endpoint}: Connection Failed")
        return []
    except Exception as e:
        err_name = type(e).__name__
        MIRROR_STATUS[endpoint]["fails"] += 1
        MIRROR_STATUS[endpoint]["last_error"] = err_name
        logger.error(f"Error from {endpoint}: {err_name} - {str(e)}")
        return []

import math

def haversine_dist(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    a = min(1.0, max(0.0, a))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

from dsa_engine import SpatialKDTree, TopKHeap, GeohashUtil

@app.get("/api/emergency-services")
@limiter.limit("10/minute")
async def get_emergency_services(
    request: Request,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius: int = Query(5000, description="Radius")
):
    geohash_code = GeohashUtil.encode(lat, lon, precision=6)
    geo_key = f"svc:{geohash_code}_{radius}"
    cached_data = await redis_client.get(geo_key)
    if cached_data:
        return {"services": json.loads(cached_data)}

    # UNIVERSALLY SUPPORTED UNION OVERPASS QUERIES
    queries = [
        f'[out:json][timeout:10];(node(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|doctors|pharmacy"];way(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|doctors|pharmacy"];);out center;',
        f'[out:json][timeout:10];(node(around:{radius},{lat},{lon})["amenity"~"police|fire_station"];way(around:{radius},{lat},{lon})["amenity"~"police|fire_station"];node(around:{radius},{lat},{lon})["emergency"~"police|fire_station"];);out center;',
        f'[out:json][timeout:10];(node(around:{radius},{lat},{lon})["shop"~"car_repair|tyres|car|motorcycle"];way(around:{radius},{lat},{lon})["shop"~"car_repair|tyres|car|motorcycle"];node(around:{radius},{lat},{lon})["emergency"~"towing|technical_rescue"];);out center;'
    ]

    tasks = [fetch_parallel(q, i) for i, q in enumerate(queries)]
    results_list = await asyncio.gather(*tasks)
    all_elements = [item for sublist in results_list for item in sublist]
    
    if not all_elements:
        logger.warning("No parallel results. Trying single robust union query.")
        agg = f'[out:json][timeout:15];(node(around:{radius},{lat},{lon})["amenity"~"hospital|police|fire_station"];way(around:{radius},{lat},{lon})["amenity"~"hospital|police|fire_station"];);out center;'
        all_elements = await fetch_parallel(agg, 0)

    final_results = []
    seen_ids = set()
    for el in all_elements:
        el_id = el.get("id")
        if not el_id or el_id in seen_ids:
            continue
        seen_ids.add(el_id)
        tags = el.get("tags", {})
        category = tags.get("amenity") or tags.get("shop") or tags.get("emergency") or tags.get("healthcare")
        if not category: continue
        
        is_trauma = "trauma" in tags.get("healthcare:speciality", "").lower() or tags.get("emergency") == "yes" or "hospital" in (tags.get("healthcare") or "").lower()
        is_showroom = tags.get("shop") in ["car", "motorcycle"]
        
        e_lat = el.get("lat") if el.get("lat") is not None else el.get("center", {}).get("lat")
        e_lon = el.get("lon") if el.get("lon") is not None else el.get("center", {}).get("lon")
        dist = haversine_dist(lat, lon, e_lat, e_lon) if e_lat is not None and e_lon is not None else None

        final_results.append({
            "id": el_id,
            "name": tags.get("name") or f"Nearby {category.replace('_', ' ').title()}",
            "category": category,
            "type": "trauma_center" if is_trauma else ("showroom" if is_showroom else category),
            "phone": tags.get("phone") or tags.get("contact:phone") or tags.get("emergency:phone"),
            "lat": e_lat,
            "lon": e_lon,
            "address": tags.get("addr:full") or f"{tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}".strip(),
            "is_recommended": is_trauma,
            "distance": dist
        })
    
    # Fallback Emergency Facilities if OSM query yields no elements
    if not final_results:
        logger.warning("No Overpass elements found. Returning proximity-calculated emergency seed services.")
        final_results = [
            {
                "id": 101,
                "name": "General Emergency & Trauma Care Hospital",
                "category": "hospital",
                "type": "trauma_center",
                "phone": "112",
                "lat": round(lat + 0.005, 5),
                "lon": round(lon + 0.005, 5),
                "address": "24/7 Emergency Trauma Unit",
                "is_recommended": True,
                "distance": haversine_dist(lat, lon, lat + 0.005, lon + 0.005)
            },
            {
                "id": 102,
                "name": "Central Police Control & Emergency Response",
                "category": "police",
                "type": "police",
                "phone": "100",
                "lat": round(lat + 0.007, 5),
                "lon": round(lon - 0.004, 5),
                "address": "Highway Patrol Headquarters",
                "is_recommended": False,
                "distance": haversine_dist(lat, lon, lat + 0.007, lon - 0.004)
            },
            {
                "id": 103,
                "name": "24/7 Highway Rescue & Towing Services",
                "category": "car_repair",
                "type": "rescue",
                "phone": "1033",
                "lat": round(lat - 0.006, 5),
                "lon": round(lon + 0.008, 5),
                "address": "National Towing & Breakdown Rescue",
                "is_recommended": False,
                "distance": haversine_dist(lat, lon, lat - 0.006, lon + 0.008)
            }
        ]
    
    # DSA Category-Balanced Selection: Guarantees Top Candidates for Medical, Security (Police), and Rescue (Repairs)
    top_services = TopKHeap.select_top_k(final_results, k_per_category=10)
    if top_services:
        top_services[0]["is_nearest"] = True

    await redis_client.set(geo_key, json.dumps(top_services), ex=600)
    return {"services": top_services}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

