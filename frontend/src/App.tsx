import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Phone, 
  Navigation, 
  ShieldAlert, 
  Stethoscope, 
  Wrench, 
  MapPin, 
  AlertTriangle, 
  Moon, 
  Sun, 
  Image as ImageIcon, 
  Clock, 
  Heart,
  List,
  Map as MapIcon, 
  X, 
  MessageSquare, 
  User 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FIRST_AID_DATA } from './data/firstAid';
import './App.css';

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

interface Service {
  id: number;
  name: string;
  category: string;
  phone?: string;
  website?: string;
  address?: string;
  lat: number;
  lon: number;
  image?: string;
  opening_hours?: string;
}

const CATEGORIES = [
  { id: 'hospital', label: 'Medical', icon: Stethoscope },
  { id: 'police', label: 'Security', icon: ShieldAlert },
  { id: 'rescue', label: 'Repairs', icon: Wrench },
  { id: 'firstaid', label: 'First Aid', icon: Heart },
];

// Component to handle map center updates
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 14);
  return null;
}

function App() {
  const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('hospital');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [contacts, setContacts] = useState<string[]>([]);
  const [profile, setProfile] = useState({
    name: '',
    bloodGroup: '',
    medicalNotes: ''
  });
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cachedServices = localStorage.getItem('roadsos_cache');
    if (cachedServices) setServices(JSON.parse(cachedServices));

    const savedTheme = localStorage.getItem('roadsos_theme');
    if (savedTheme === 'light') setIsDarkMode(false);

    const savedContacts = localStorage.getItem('roadsos_contacts');
    if (savedContacts) setContacts(JSON.parse(savedContacts));

    const savedProfile = localStorage.getItem('roadsos_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));

    fetchLocation();
    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? '' : 'light-mode';
    localStorage.setItem('roadsos_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const saveProfile = (newProfile: any) => {
    setProfile(newProfile);
    localStorage.setItem('roadsos_profile', JSON.stringify(newProfile));
  };

  const fetchLocation = () => {
    setError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMounted.current) {
            setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            setError(null);
          }
        },
        (err) => {
          console.error("Location Error:", err);
          if (isMounted.current) {
            if (err.code === err.PERMISSION_DENIED) {
              setError("LOCATION BLOCKED: Please enable GPS in your browser settings to find emergency services.");
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              setError("GPS SIGNAL LOST: Try moving to an open area.");
            } else {
              setError("Location access required for SOS functions.");
            }
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      if (isMounted.current) setError("GPS is not supported by your browser.");
    }
  };

  const getEmergencyServices = async () => {
    setLoading(true);
    setError(null);
    
    const performFetch = async (lat: number, lon: number) => {
      try {
        const res = await axios.get(`/api/emergency-services?lat=${lat}&lon=${lon}&radius=5000`);
        if (isMounted.current) {
          setServices(res.data.services);
          localStorage.setItem('roadsos_cache', JSON.stringify(res.data.services));
        }
      } catch {
        if (isMounted.current) {
          setError(isOffline ? "You are offline. Showing cached data." : "Failed to sync with emergency network.");
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    if (!location) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            if (isMounted.current) setLocation(newLoc);
            performFetch(newLoc.lat, newLoc.lon);
          },
          (err) => {
            console.error("Location Error:", err);
            if (isMounted.current) {
              setError("Location access required for SOS functions.");
              setLoading(false);
            }
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        if (isMounted.current) {
          setError("GPS is not supported.");
          setLoading(false);
        }
      }
    } else {
      await performFetch(location.lat, location.lon);
    }
  };

  const filteredServices = services.filter(s => {
    if (!s.category) return false;
    
    if (activeCategory === 'hospital') {
      return ['hospital', 'clinic', 'doctors', 'pharmacy', 'ambulance_station', 'healthcare'].includes(s.category);
    }
    if (activeCategory === 'police') {
      return ['police', 'fire_station', 'emergency_phone'].includes(s.category);
    }
    if (activeCategory === 'rescue') {
      return [
        'car_repair', 
        'motorcycle_repair', 
        'tyres', 
        'fuel', 
        'tow_truck', 
        'mechanic', 
        'breakdown_service',
        'bicycle_repair_station',
        'car',
        'motorcycle'
      ].includes(s.category);
    }
    return s.category === activeCategory || s.category.includes(activeCategory);
  });

  const saveContacts = (newContacts: string[]) => {
    setContacts(newContacts);
    localStorage.setItem('roadsos_contacts', JSON.stringify(newContacts));
  };

  const sendAlerts = () => {
    if (contacts.length === 0) {
      alert("Please add emergency contacts in Settings first.");
      setShowSettings(true);
      return;
    }
    
    const locStr = location ? `https://www.google.com/maps?q=${location.lat},${location.lon}` : "Unknown Location";
    const message = encodeURIComponent(`EMERGENCY SOS: I need help! My current location is: ${locStr}`);
    
    // Web browsers generally restrict opening multiple links at once.
    // We'll join contacts with a semicolon for some mobile OS support, 
    // but primarily target the first contact while notifying the user.
    const phoneList = contacts.join(';');
    window.open(`sms:${phoneList}?body=${message}`);
    
    if (contacts.length > 1) {
      console.log("Alerting multiple contacts:", contacts);
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? '' : 'light-mode'}`}>
      {isOffline && <div className="offline-notice">WORKING OFFLINE • CACHED DATA ONLY</div>}
      
      <header>
        <div className="header-titles">
          <h1>ROADSoS</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="theme-toggle" onClick={() => setShowSettings(true)}>
            <User size={20} />
          </button>
          <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="error-banner" style={{ flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
            {error.includes("LOCATION") && (
              <button 
                className="btn btn-nav" 
                style={{ width: '100%', fontSize: '0.75rem', padding: '6px' }}
                onClick={fetchLocation}
              >
                RE-TRY LOCATION ACCESS
              </button>
            )}
          </div>
        )}

        <div className="sos-section">
          {!loading && <div className="sos-ripple"></div>}
          <button 
            className={`sos-button ${loading ? 'loading' : ''}`} 
            onClick={getEmergencyServices} 
            disabled={loading}
          >
            <AlertTriangle size={32} fill="white" />
            <span style={{ fontSize: '0.7rem', marginTop: 4 }}>{loading ? 'SYNCING...' : 'S O S'}</span>
          </button>
        </div>

        {contacts.length > 0 && (
          <button 
            className="btn btn-call" 
            style={{ width: '100%', marginBottom: '1.5rem', borderRadius: '14px', padding: '12px' }}
            onClick={sendAlerts}
          >
            <MessageSquare size={18} /> ALERT EMERGENCY CONTACTS
          </button>
        )}

        <div className="category-bar">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className={`category-item ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
              <cat.icon size={18} />
              {cat.label}
            </div>
          ))}
        </div>

        {activeCategory !== 'firstaid' && (
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
              <List size={16} /> List
            </button>
            <button className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}>
              <MapIcon size={16} /> Map
            </button>
          </div>
        )}

        <div className="content-area">
          {activeCategory === 'firstaid' ? (
            <div className="first-aid-list">
              <h2 style={{ marginBottom: '1rem' }}>Emergency First Aid</h2>
              {FIRST_AID_DATA.map((item, idx) => (
                <div key={idx} className="first-aid-card">
                  <h4>{item.title}</h4>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.scenario}</p>
                  <ol className="first-aid-steps">
                    {item.steps.map((step, sIdx) => <li key={sIdx}>{step}</li>)}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <div className="services-container">
              <div className={`service-list-section ${viewMode === 'map' ? 'mobile-hidden' : ''}`}>
                {filteredServices.length > 0 ? filteredServices.map(service => (
                  <div key={service.id} className="service-card">
                    <div 
                      className="service-img" 
                      style={service.image ? { backgroundImage: `url(${service.image})` } : {}}
                    >
                      {!service.image && <ImageIcon size={32} opacity={0.3} />}
                    </div>
                    
                    <div className="service-details">
                      <h3>{service.name}</h3>
                      <table className="detail-table">
                        <tbody>
                          <tr>
                            <td className="label">Location</td>
                            <td className="value"><MapPin size={12} /> {service.address || 'GPS Coordinate'}</td>
                          </tr>
                          {service.opening_hours && (
                            <tr>
                              <td className="label">Hours</td>
                              <td className="value"><Clock size={12} /> {service.opening_hours}</td>
                            </tr>
                          )}
                          {service.phone && (
                            <tr>
                              <td className="label">Contact</td>
                              <td className="value"><Phone size={12} /> {service.phone}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="card-actions">
                      <button className="btn btn-call" onClick={() => service.phone && window.open(`tel:${service.phone}`)}>
                        <Phone size={16} /> CALL
                      </button>
                      <button className="btn btn-nav" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lon}`)}>
                        <Navigation size={16} /> MAP
                      </button>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.5 }}>
                    <p>No active services in this category.</p>
                    <p>Tap SOS to refresh nearby data.</p>
                  </div>
                )}
              </div>

              {location && (
                <div className={`map-section ${viewMode === 'list' ? 'mobile-hidden' : ''}`}>
                  <div className="location-badge">
                    <MapPin size={12} /> {location.lat.toFixed(5)}, {location.lon.toFixed(5)}
                  </div>
                  <MapContainer center={[location.lat, location.lon]} zoom={14} scrollWheelZoom={false}>
                    <ChangeView center={[location.lat, location.lon]} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[location.lat, location.lon]} icon={UserIcon}>
                      <Popup>You are here</Popup>
                    </Marker>
                    {filteredServices.map(s => (
                      <Marker key={s.id} position={[s.lat, s.lon]}>
                        <Popup>
                          <strong>{s.name}</strong><br/>
                          {s.category}
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>User Profile</h2>
              <button className="theme-toggle" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            
            <div className="settings-scroll-area">
              <section className="settings-section">
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--primary-red)' }}>Personal Details</h3>
                <input 
                  type="text" 
                  placeholder="Full Name"
                  className="contact-input"
                  value={profile.name}
                  onChange={(e) => saveProfile({...profile, name: e.target.value})}
                />
                <select 
                  className="contact-input"
                  value={profile.bloodGroup}
                  onChange={(e) => saveProfile({...profile, bloodGroup: e.target.value})}
                >
                  <option value="">Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                <textarea 
                  placeholder="Medical Conditions / Allergies"
                  className="contact-input"
                  rows={3}
                  value={profile.medicalNotes}
                  onChange={(e) => saveProfile({...profile, medicalNotes: e.target.value})}
                  style={{ resize: 'none' }}
                />
              </section>

              <section className="settings-section" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--primary-red)' }}>Emergency Contacts</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  These numbers will be alerted during an SOS.
                </p>
                {[0, 1, 2].map(idx => (
                  <input 
                    key={idx}
                    type="tel" 
                    placeholder={`Contact ${idx + 1}`}
                    className="contact-input"
                    value={contacts[idx] || ''}
                    onChange={(e) => {
                      const newC = [...contacts];
                      newC[idx] = e.target.value;
                      saveContacts(newC.filter(c => c !== ''));
                    }}
                  />
                ))}
              </section>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-call" style={{ width: '100%' }} onClick={() => setShowSettings(false)}>
                SAVE & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '2rem', fontSize: '0.7rem', opacity: 0.5 }}>
        ROADSoS GLOBAL EMERGENCY NETWORK © 2026
      </footer>
    </div>
  );
}

export default App;
