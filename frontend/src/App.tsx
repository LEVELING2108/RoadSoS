import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Stethoscope, 
  Wrench, 
  AlertTriangle, 
  Heart,
  List,
  Map as MapIcon, 
  X, 
  Menu,
  MessageSquare, 
  User,
  Mic,
  MicOff,
  Activity,
  Zap
} from 'lucide-react';
import { FIRST_AID_DATA } from './data/firstAid';
import { getEmergencyConfig } from './data/emergencyNumbers';
import type { EmergencyConfig } from './data/emergencyNumbers';
import './App.css';

// Lazy load heavy Map component
const MapComponent = lazy(() => import('./components/MapComponent'));
import ServiceCard from './components/ServiceCard';
import ThemeToggle from './components/ThemeToggle';

// Configure Production API URL
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
axios.defaults.baseURL = API_URL;
axios.defaults.timeout = 15000; // 15s timeout for slow Render spin-ups

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
  is_recommended?: boolean;
}

const CATEGORIES = [
  { id: 'hospital', label: 'medical', icon: Stethoscope },
  { id: 'police', label: 'security', icon: ShieldAlert },
  { id: 'rescue', label: 'repairs', icon: Wrench },
  { id: 'firstaid', label: 'first_aid', icon: Heart },
];

function App() {
  const { t, i18n } = useTranslation();
  const locationRef = useRef<{ lat: number, lon: number } | null>(null);
  const [location, setLocationState] = useState<{ lat: number, lon: number } | null>(null);
  
  const setLocation = useCallback((loc: { lat: number, lon: number } | null) => {
    locationRef.current = loc;
    setLocationState(loc);
  }, []);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('hospital');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [contacts, setContacts] = useState<string[]>([]);
  const [trackingSessionId, setTrackingSessionId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [isMonitoringVitals, setIsMonitoringVitals] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<number[]>([]);
  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyConfig>(getEmergencyConfig('DEFAULT'));
  const [profile, setProfile] = useState({
    name: '',
    bloodGroup: '',
    medicalNotes: ''
  });
  const isMounted = useRef(true);
  const ws = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  // --- Callbacks ---

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      const patterns = { light: 10, medium: 30, heavy: 60 };
      window.navigator.vibrate(patterns[type]);
    }
  }, []);

  const fetchServices = useCallback(async (lat: number, lon: number, category: string) => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/emergency-services', {
        params: { lat, lon, category, radius: 5000 }
      });
      if (isMounted.current) setServices(res.data.services || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      if (isMounted.current) setError(t('fetch_error'));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [t]);

  const initTracking = useCallback(async () => {
    try {
      const res = await axios.post('/api/create-session');
      const sid = res.data.session_id;
      setTrackingSessionId(sid);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${API_URL.replace(/^https?:\/\//, '')}/ws/track/${sid}`;
      
      ws.current = new WebSocket(wsUrl);
      ws.current.onopen = () => console.log("Tracking Connected");
      ws.current.onclose = () => console.log("Tracking Disconnected");
    } catch (err) {
      console.error("Tracking Error:", err);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const sendAlerts = useCallback(() => {
    if (contacts.length === 0) { setShowSettings(true); return; }
    const loc = locationRef.current ? `https://www.google.com/maps?q=${locationRef.current.lat},${locationRef.current.lon}` : "Unknown";
    const link = trackingSessionId ? `${window.location.origin}/?track=${trackingSessionId}` : "";
    window.open(`sms:${contacts.join(';')}?body=${encodeURIComponent(`EMERGENCY SOS: Location: ${loc}. Track: ${link}`)}`);
  }, [contacts, trackingSessionId]);

  // --- Effects ---

  useEffect(() => {
    isMounted.current = true;
    
    // Voice Recognition Setup
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = i18n.language;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('')
          .toLowerCase();

        if (transcript.includes('sos') || transcript.includes('help') || transcript.includes('emergency')) {
          sendAlerts();
          triggerHaptic('heavy');
          speak(t('sos_triggered_voice'));
        }
      };

      recognitionRef.current = recognition;
    }

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          setLocation({ lat, lon });
          fetchServices(lat, lon, activeCategory);
          initTracking();

          // Identify Country for Config
          axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(res => {
              const code = res.data.address.country_code?.toUpperCase();
              setEmergencyConfig(getEmergencyConfig(code));
            })
            .catch(() => {});
        },
        (err) => {
          console.error(err);
          setError(t('location_error'));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load user data
    const cached = ['roadsos_cache', 'roadsos_contacts', 'roadsos_profile'].map(k => localStorage.getItem(k));
    if (cached[1]) setContacts(JSON.parse(cached[1]));
    if (cached[2]) setProfile(JSON.parse(cached[2]));

    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws.current) ws.current.close();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [activeCategory, fetchServices, initTracking, t, i18n.language, triggerHaptic, speak, setLocation, sendAlerts]);

  useEffect(() => {
    if (location && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(location));
    }
  }, [location]);

  // --- Handlers ---

  const handleSOS = () => {
    triggerHaptic('heavy');
    const config = emergencyConfig;
    const num = activeCategory === 'police' ? config.police : 
                activeCategory === 'hospital' ? config.ambulance : config.combined || config.ambulance;
    window.location.href = `tel:${num}`;
  };

  const toggleVoice = () => {
    if (!isListening) {
      recognitionRef.current?.start();
      setIsListening(true);
      triggerHaptic('medium');
    } else {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  };

  const startVitalsMonitor = useCallback(async () => {
    if (isMonitoringVitals) {
      setIsMonitoringVitals(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setIsMonitoringVitals(true);
      triggerHaptic('medium');
      
      // Heart rate simulation (POC)
      let lastTime = Date.now();
      const processFrame = () => {
        if (!isMounted.current) return;
        const now = Date.now();
        if (now - lastTime > 1000) {
          if (Math.random() > 0.3) {
            const bpm = 65 + Math.floor(Math.random() * 15);
            if (bpm > 40 && bpm < 180) { setHeartRate(bpm); setVitalsHistory(prev => [...prev.slice(-20), bpm]); }
            lastTime = now;
          }
        }
        if (isMounted.current) requestAnimationFrame(processFrame);
        else stream.getTracks().forEach(t => t.stop());
      };
      requestAnimationFrame(processFrame);
    } catch (err) {
      console.error("Vitals Monitor Error:", err);
      setError(t('camera_blocked'));
    }
  }, [isMonitoringVitals, triggerHaptic, t]);

  const saveProfile = (p: any) => { setProfile(p); localStorage.setItem('roadsos_profile', JSON.stringify(p)); };
  const saveContacts = (c: string[]) => { setContacts(c); localStorage.setItem('roadsos_contacts', JSON.stringify(c)); };

  return (
    <div className="app-container">
      {isOffline && <div className="offline-notice">{t('offline_notice')}</div>}
      <AnimatePresence>
        {isListening && (
          <motion.div className="offline-notice" style={{ background: 'var(--primary-red)', color: 'white' }} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {t('voice_sos_active')}
          </motion.div>
        )}
      </AnimatePresence>

      <header>
        <div className="header-titles">
          <h1>{t('app_name')}</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ThemeToggle />
          <button className="theme-toggle" onClick={() => setShowSettings(true)}><User size={20} /></button>
          <button className="theme-toggle mobile-only" onClick={() => setIsMenuOpen(true)}><Menu size={20} /></button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div className="mobile-menu-overlay" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
            <div className="mobile-menu-content">
              <div style={{ padding: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="theme-toggle" onClick={() => setIsMenuOpen(false)}><X size={32} /></button>
              </div>
              <nav className="mobile-nav-links">
                <button className="mobile-nav-item" onClick={() => { setShowSettings(true); setIsMenuOpen(false); }}>
                  <User size={24} />
                  <span>{t('profile')}</span>
                </button>
                <button className="mobile-nav-item" onClick={() => { setIsMenuOpen(false); startVitalsMonitor(); }}>
                  <Activity size={24} />
                  <span>{t('vitals')}</span>
                </button>
                <button className="mobile-nav-item" onClick={() => { setIsMenuOpen(false); toggleVoice(); }}>
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                  <span>{isListening ? t('disable_voice') : t('enable_voice')}</span>
                </button>
                <button className="mobile-nav-item" onClick={() => { setIsMenuOpen(false); sendAlerts(); }}>
                  <MessageSquare size={24} />
                  <span>{t('send_alerts')}</span>
                </button>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="main-content">
        <div className="sos-section">
          <div className="sos-button-wrapper">
            <motion.div className="sos-ripple" animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
            <button className="sos-button" onClick={handleSOS}>
              <AlertTriangle size={48} style={{ marginBottom: '8px' }} />
              SOS
            </button>
          </div>
        </div>

        <div className="category-bar">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className={`category-item ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => { setActiveCategory(cat.id); location && fetchServices(location.lat, location.lon, cat.id); }}>
              <cat.icon size={18} />
              <span>{t(cat.label)}</span>
            </div>
          ))}
          <div className={`category-item ${activeCategory === 'vitals' ? 'active' : ''}`} onClick={() => setActiveCategory('vitals')}>
            <Activity size={18} />
            <span>{t('vitals')}</span>
          </div>
        </div>

        <div className="content-area">
          {activeCategory === 'vitals' ? (
            <div className="vitals-monitor">
              <div className="service-card vitals-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>{t('vitals_monitor')}</h3>
                  <Zap size={20} color={isMonitoringVitals ? "var(--primary-red)" : "gray"} />
                </div>
                {!isMonitoringVitals ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ marginBottom: '1.5rem', opacity: 0.7 }}>{t('vitals_description')}</p>
                    <button className="btn btn-call" onClick={startVitalsMonitor}>{t('start_monitoring')}</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <div className="bpm-value">{heartRate || '--'} <span style={{ fontSize: '1rem' }}>BPM</span></div>
                      <p style={{ opacity: 0.5 }}>{t('keep_steady')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '60px', gap: '2px', background: 'var(--input-bg)', borderRadius: '8px', padding: '4px' }}>
                      {vitalsHistory.map((v, i) => (
                        <div key={i} style={{ flex: 1, background: 'var(--primary-red)', height: `${(v / 180) * 100}%`, borderRadius: '2px' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeCategory === 'firstaid' ? (
            <div className="first-aid-section">
              {FIRST_AID_DATA.map((item, idx) => (
                <motion.div key={idx} className="service-card" style={{ marginBottom: '1rem', padding: '1.5rem' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary-red)', marginBottom: '1rem' }}>
                    <AlertTriangle size={20} /> {item.title}
                  </h3>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {item.steps.map((step, sIdx) => <li key={sIdx} style={{ marginBottom: '0.5rem', opacity: 0.8 }}>{step}</li>)}
                  </ul>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="services-container">
              <div className="view-toggle">
                <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={18} /> {t('list_view')}</button>
                <button className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}><MapIcon size={18} /> {t('map_view')}</button>
              </div>

              <div className={`service-list-section ${viewMode === 'map' ? 'mobile-hidden' : ''}`}>
                {loading && <div className="loading-spinner">Searching {activeCategory}...</div>}
                {error && <div className="error-notice">{error}</div>}
                <AnimatePresence mode="popLayout">
                  {services.length > 0 ? (
                    services.map((svc, idx) => (
                      <ServiceCard 
                        key={svc.id} 
                        service={svc} 
                        idx={idx}
                        t={t}
                        onCall={(num) => window.location.href = `tel:${num}`}
                        onNavigate={(s) => setRouteCoordinates([[location!.lat, location!.lon], [s.lat, s.lon]])}
                        onExternalMap={(lat, lon) => window.open(`https://www.google.com/maps?q=${lat},${lon}`)}
                      />
                    ))
                  ) : !loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} style={{ textAlign: 'center', marginTop: '3rem' }}><p>{t('nearby_services')}</p><p>{t('refresh_data')}</p></motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className={`map-section ${viewMode === 'list' ? 'mobile-hidden' : ''}`}>
                {location && (
                  <Suspense fallback={<div className="loading-spinner">Loading Map...</div>}>
                    <MapComponent location={location} services={services} routeCoordinates={routeCoordinates} />
                  </Suspense>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            className="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
          >
            <motion.div 
              className="settings-modal"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>{t('settings')}</h2><button className="theme-toggle" onClick={() => setShowSettings(false)}><X size={20} /></button>
              </div>
              <div className="settings-scroll-area">
                <section className="settings-section">
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--primary-red)' }}>Language / भाषा</h3>
                  <select className="contact-input" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                    <optgroup label="Global Languages">
                      <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option>
                    </optgroup>
                    <optgroup label="Indian Scheduled Languages">
                      <option value="hi">हिन्दी (Hindi)</option><option value="as">অসমীয়া (Assamese)</option><option value="bn">বাংলা (Bengali)</option><option value="brx">बर' (Bodo)</option><option value="doi">डोगरी (Dogri)</option><option value="gu">ગુજરાતી (Gujarati)</option><option value="kn">કನ್ನಡ (Kannada)</option><option value="ks">کٲشُر (Kashmiri)</option><option value="kok">कोंकणी (Konkani)</option><option value="mai">मैथिली (Maithili)</option><option value="ml">മലയാളം (Malayalam)</option><option value="mni">মৈতৈলোন (Manipuri)</option><option value="mr">মারাঠি (Marathi)</option><option value="ne">नेपाली (Nepali)</option><option value="or">ଓଡ଼ିଆ (Odia)</option><option value="pa">ਪੰਜਾਬੀ (Punjabi)</option><option value="sa">संस्कृतम् (Sanskrit)</option><option value="sat">संताली (Santali)</option><option value="sd">सिंधी (Sindhi)</option><option value="ta">தமிழ் (Tamil)</option><option value="te">తెలుగు (Telugu)</option><option value="ur">اردو (Urdu)</option>
                    </optgroup>
                  </select>
                </section>
                <section className="settings-section" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--primary-red)' }}>{t('personal_details')}</h3>
                  <input type="text" placeholder={t('full_name')} className="contact-input" value={profile.name} onChange={(e) => saveProfile({...profile, name: e.target.value})} />
                  <select className="contact-input" value={profile.bloodGroup} onChange={(e) => saveProfile({...profile, bloodGroup: e.target.value})}>
                    <option value="">{t('blood_group')}</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                  <textarea placeholder={t('medical_notes')} className="contact-input" rows={3} value={profile.medicalNotes} onChange={(e) => saveProfile({...profile, medicalNotes: e.target.value})} style={{ resize: 'none' }} />
                </section>
                <section className="settings-section" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--primary-red)' }}>{t('contacts')}</h3>
                  {[0, 1, 2].map(idx => (
                    <input key={idx} type="tel" placeholder={`Contact ${idx + 1}`} className="contact-input" value={contacts[idx] || ''} onChange={(e) => { const newC = [...contacts]; newC[idx] = e.target.value; saveContacts(newC.filter(c => c !== '')); }} />
                  ))}
                </section>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}><button className="btn btn-call" style={{ width: '100%' }} onClick={() => setShowSettings(false)}>{t('save_close')}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ textAlign: 'center', padding: '2rem', fontSize: '0.7rem', opacity: 0.5 }}>ROADSoS GLOBAL EMERGENCY NETWORK © 2026</footer>
    </div>
  );
}

export default App;
