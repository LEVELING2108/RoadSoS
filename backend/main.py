from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging

app = FastAPI(title="ROADSoS API")

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

@app.get("/api/emergency-services")
async def get_emergency_services(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    radius: int = Query(5000, description="Search radius in meters")
):
    """
    Fetch nearby emergency services (hospitals, police, rescue) from Overpass API.
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
            raise HTTPException(status_code=503, detail="Emergency services provider is currently unavailable. Please try again or use direct dial.")

    elements = data.get("elements", [])
    results = []
    
    for el in elements:
        tags = el.get("tags", {})
        
        # Determine a primary category
        category = (
            tags.get("amenity") or 
            tags.get("shop") or 
            tags.get("emergency") or 
            tags.get("healthcare")
        )
        
        if not category:
            continue

        item = {
            "id": el.get("id"),
            "type": el.get("type"),
            "lat": el.get("lat") or el.get("center", {}).get("lat"),
            "lon": el.get("lon") or el.get("center", {}).get("lon"),
            "name": tags.get("name") or tags.get("operator") or f"Nearby {category.replace('_', ' ').title()}",
            "category": category,
            "phone": tags.get("phone") or tags.get("contact:phone") or tags.get("emergency:phone"),
            "website": tags.get("website") or tags.get("contact:website"),
            "address": tags.get("addr:full") or f"{tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}".strip(),
            "image": tags.get("image") or tags.get("wikimedia_commons"),
            "opening_hours": tags.get("opening_hours")
        }
        results.append(item)
            
    return {"services": results}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
