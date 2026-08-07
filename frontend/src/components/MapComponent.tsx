import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom SVG HTML Icons
const createCustomIcon = (type: string, isNearest: boolean) => {
  let emoji = '🏥';
  let colorClass = 'hospital';
  
  if (type === 'trauma_center') {
    emoji = '🚨';
    colorClass = 'trauma';
  } else if (type === 'police') {
    emoji = '👮';
    colorClass = 'police';
  } else if (type === 'car_repair' || type === 'showroom' || type === 'rescue') {
    emoji = '🔧';
    colorClass = 'rescue';
  }

  const nearestBadge = isNearest ? `<span class="map-badge-nearest">⚡ NEAREST</span>` : '';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="marker-wrapper ${colorClass} ${isNearest ? 'nearest-pulse' : ''}">
        <div class="marker-icon-box">${emoji}</div>
        ${nearestBadge}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

const UserLocationIcon = L.divIcon({
  className: 'custom-leaflet-marker user-marker',
  html: `
    <div class="user-beacon-wrapper">
      <div class="user-beacon-dot"></div>
      <div class="user-beacon-ring"></div>
      <div class="user-beacon-ring-outer"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Component to smoothly fly camera to target location or selected service
function MapController({ 
  location, 
  selectedService, 
  routeCoordinates 
}: { 
  location: { lat: number; lon: number }; 
  selectedService: any | null; 
  routeCoordinates: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    } else if (selectedService) {
      map.flyTo([selectedService.lat, selectedService.lon], 16, { duration: 1.2 });
    } else if (location) {
      map.setView([location.lat, location.lon], 14, { animate: true });
    }
  }, [location, selectedService, routeCoordinates, map]);

  return null;
}

interface Service {
  id: number;
  name: string;
  category: string;
  type?: string;
  phone?: string;
  address?: string;
  lat: number;
  lon: number;
  is_recommended?: boolean;
  distance?: number;
  is_nearest?: boolean;
}

interface MapComponentProps {
  location: { lat: number; lon: number };
  services: Service[];
  selectedService: Service | null;
  routeCoordinates: [number, number][];
  onCall: (phone: string) => void;
  onNavigate: (service: Service) => void;
  onExternalMap: (lat: number, lon: number) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  location, 
  services, 
  selectedService, 
  routeCoordinates,
  onCall,
  onNavigate,
  onExternalMap
}) => {
  const markerRefs = useRef<{ [key: number]: L.Marker | null }>({});

  useEffect(() => {
    if (selectedService && markerRefs.current[selectedService.id]) {
      markerRefs.current[selectedService.id]?.openPopup();
    }
  }, [selectedService]);

  return (
    <div className="interactive-map-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer 
        center={[location.lat, location.lon]} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', borderRadius: '20px' }}
      >
        <MapController location={location} selectedService={selectedService} routeCoordinates={routeCoordinates} />
        
        {/* Dark / Modern Tile Layer */}
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />

        {/* 5km Golden Hour Search Perimeter */}
        <Circle 
          center={[location.lat, location.lon]} 
          radius={5000} 
          pathOptions={{ color: 'var(--primary-red)', fillColor: 'var(--primary-red)', fillOpacity: 0.06, weight: 1.5, dashArray: '6, 6' }} 
        />

        {/* User Beacon Marker */}
        <Marker position={[location.lat, location.lon]} icon={UserLocationIcon}>
          <Popup className="emergency-popup">
            <div className="popup-content">
              <strong style={{ color: 'var(--primary-red)' }}>📍 YOUR LIVE SOS LOCATION</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>{location.lat.toFixed(5)}, {location.lon.toFixed(5)}</p>
            </div>
          </Popup>
        </Marker>

        {/* Dynamic Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            pathOptions={{ color: '#ff3b30', weight: 6, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} 
          />
        )}

        {/* Emergency Service Markers */}
        {services.map(s => {
          const icon = createCustomIcon(s.type || s.category, !!s.is_nearest);
          return (
            <Marker 
              key={s.id} 
              position={[s.lat, s.lon]} 
              icon={icon}
              ref={el => { markerRefs.current[s.id] = el; }}
            >
              <Popup className="emergency-popup">
                <div className="popup-card" style={{ minWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {s.is_nearest && <span className="badge" style={{ background: '#FF9500', color: '#fff', fontSize: '0.65rem' }}>⚡ NEAREST</span>}
                    {s.type === 'trauma_center' && <span className="badge trauma-badge" style={{ fontSize: '0.65rem' }}>TRAUMA CENTER</span>}
                    {s.distance !== undefined && <span className="badge" style={{ background: '#3a3a3c', color: '#fff', fontSize: '0.65rem' }}>📍 {s.distance} km</span>}
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>{s.name}</h4>
                  {s.address && <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', opacity: 0.7 }}>{s.address}</p>}
                  
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {s.phone && (
                      <button 
                        className="btn btn-call" 
                        style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }} 
                        onClick={() => onCall(s.phone!)}
                      >
                        📞 Call
                      </button>
                    )}
                    <button 
                      className="btn btn-nav" 
                      style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }} 
                      onClick={() => onNavigate(s)}
                    >
                      🧭 Route
                    </button>
                  </div>
                  <button 
                    className="btn btn-nav" 
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem', marginTop: '4px' }} 
                    onClick={() => onExternalMap(s.lat, s.lon)}
                  >
                    🗺️ Google Maps
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default React.memo(MapComponent);
