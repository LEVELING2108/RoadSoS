import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet Icon Fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom User Location Icon (Blue Circle)
const UserIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<div class="user-dot"></div><div class="user-pulse"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Component to handle map center updates
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 14);
  return null;
}

interface Service {
  id: number;
  name: string;
  category: string;
  lat: number;
  lon: number;
}

interface MapComponentProps {
  location: { lat: number; lon: number };
  services: Service[];
  routeCoordinates: [number, number][];
}

const MapComponent: React.FC<MapComponentProps> = ({ location, services, routeCoordinates }) => {
  return (
    <MapContainer center={[location.lat, location.lon]} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <ChangeView center={[location.lat, location.lon]} />
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[location.lat, location.lon]} icon={UserIcon}>
        <Popup>You are here</Popup>
      </Marker>
      {routeCoordinates.length > 0 && (
        <Polyline positions={routeCoordinates} color="var(--primary-red)" weight={5} opacity={0.7} />
      )}
      {services.map(s => (
        <Marker key={s.id} position={[s.lat, s.lon]}>
          <Popup><strong>{s.name}</strong><br/>{s.category}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default React.memo(MapComponent);
