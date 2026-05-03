import { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  ShieldAlert, 
  Stethoscope, 
  Wrench, 
  AlertTriangle, 
  Heart,
  List,
  Map as MapIcon, 
  X, 
  MessageSquare, 
  User,
  Mic,
  MicOff,
  Camera,
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
  const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('hospital');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [contacts, setContacts] = useState<string[]>([]);
  const [trackingSessionId, setTrackingSessionId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMonitoringVitals, setIsMonitoringVitals] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<number[]>([]);
  const [triageStep, setTriageStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [countryCode, setCountryCode] = useState<string>('DEFAULT');
  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyConfig>(getEmergencyConfig('DEFAULT'));
  const [profile, setProfile] = useState({
    name: '',
    bloodGroup: '',
    medicalNotes: ''
  });
  const isMounted = useRef(true);
  const ws = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  // --- Callbacks (Defined early to avoid hoisting issues) ---

  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [i18n.language]);

  const fetchRegionInfo = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const code = res.data.address.country_code.toUpperCase();
      setCountryCode(code);
      setEmergencyConfig(getEmergencyConfig(code));
    } catch (e) { console.error("Region Info Error:", e); }
  }, []);

  const startTracking = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await axios.post('/api/create-session');
      const id = res.data.session_id;
      setTrackingSessionId(id);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : `${window.location.hostname}:8000`;
      const socket = new WebSocket(`${protocol}//${host}/ws/track/${id}`);
      socket.onopen = () => socket.send(JSON.stringify({ lat, lon }));
      ws.current = socket;
      if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition((pos) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }));
          }
        });
      }
    } catch (e) { console.error("Tracking Session Error:", e); }
  }, []);

  const getEmergencyServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const fetchWithCoords = async (lat: number, lon: number) => {
      try {
        const contextParam = aiAnalysis ? `&context=${encodeURIComponent(aiAnalysis)}` : "";
        const [servicesRes] = await Promise.all([
          axios.get(`/api/emergency-services?lat=${lat}&lon=${lon}&radius=5000${contextParam}`),
          fetchRegionInfo(lat, lon),
          startTracking(lat, lon)
        ]);
        
        if (isMounted.current) {
          setServices(servicesRes.data.services);
          localStorage.setItem('roadsos_cache', JSON.stringify(servicesRes.data.services));
        }
      } catch (err) {
        console.error("Fetch Services Error:", err);
        if (isMounted.current) setError(isOffline ? t('offline_notice') : "Failed to sync with emergency network.");
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
            fetchWithCoords(newLoc.lat, newLoc.lon);
          },
          () => { if (isMounted.current) { setError("Location required."); setLoading(false); } },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    } else {
      await fetchWithCoords(location.lat, location.lon);
    }
  }, [location, aiAnalysis, isOffline, t, fetchRegionInfo, startTracking]);

  const startVoiceTriage = useCallback(() => {
    setTriageStep(1);
    getEmergencyServices();
    speak(t('voice_sos_active'));
  }, [getEmergencyServices, speak, t]);

  const proceedTriage = useCallback(() => {
    if (triageStep === 1) { setTriageStep(2); speak(t('voice_step_1')); }
    else if (triageStep === 2) { setTriageStep(3); speak(t('voice_step_2')); }
    else if (triageStep === 3) { setTriageStep(4); speak(t('voice_step_3')); setTimeout(() => setTriageStep(0), 10000); }
  }, [triageStep, speak, t]);

  const fetchLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMounted.current) {
            const newLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            setLocation(newLoc);
            fetchRegionInfo(newLoc.lat, newLoc.lon);
          }
        },
        (err) => { if (isMounted.current) setError(err.code === 1 ? t('location_blocked') : t('gps_lost')); },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [fetchRegionInfo, t]);

  const joinTrackingSession = useCallback((id: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : `${window.location.hostname}:8000`;
    const socket = new WebSocket(`${protocol}//${host}/ws/track/${id}`);
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.lat && data.lon) {
        setLocation({ lat: data.lat, lon: data.lon });
        setViewMode('map');
        setError(t('tracking_active'));
      }
    };
    ws.current = socket;
    setTrackingSessionId(id);
  }, [t]);

  const [triageHistory, setTriageHistory] = useState<{ id: string, date: string, analysis: string }[]>([]);

  // ... (inside useEffect)
  useEffect(() => {
    isMounted.current = true;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = i18n.language;
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('').toLowerCase();
        const trigger = t('sos').toLowerCase();
        if (transcript.includes(trigger) && triageStep === 0) {
          triggerHaptic([500, 200, 500]);
          startVoiceTriage();
        } else if (isListening && triageStep > 0) {
          if (transcript.length > 5) proceedTriage();
        }
      };
      recognition.onend = () => { if (isListening) recognition.start(); };
      recognitionRef.current = recognition;
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cached = ['roadsos_cache', 'roadsos_contacts', 'roadsos_profile', 'roadsos_history'].map(k => localStorage.getItem(k));
    if (cached[0]) setServices(JSON.parse(cached[0]));
    if (cached[1]) setContacts(JSON.parse(cached[1]));
    if (cached[2]) setProfile(JSON.parse(cached[2]));
    if (cached[3]) setTriageHistory(JSON.parse(cached[3] || '[]'));

    fetchLocation();
    const trackId = new URLSearchParams(window.location.search).get('track');
    if (trackId) joinTrackingSession(trackId);

    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws.current) ws.current.close();
    };
  }, [i18n.language, t, triageStep, isListening, fetchLocation, joinTrackingSession, proceedTriage, startVoiceTriage, triggerHaptic]);

  // --- Memoized Data ---

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      if (!s.category) return false;
      if (activeCategory === 'hospital') {
        return ['hospital', 'clinic', 'doctors', 'pharmacy', 'ambulance_station', 'healthcare'].includes(s.category);
      }
      if (activeCategory === 'police') {
        return ['police', 'fire_station', 'emergency_phone'].includes(s.category);
      }
      if (activeCategory === 'rescue') {
        return ['car_repair', 'motorcycle_repair', 'tyres', 'fuel', 'tow_truck', 'mechanic', 'breakdown_service', 'bicycle_repair_station', 'car', 'motorcycle'].includes(s.category);
      }
      return s.category === activeCategory || s.category.includes(activeCategory);
    });
  }, [services, activeCategory]);

  // --- Handlers ---

  const toggleListening = useCallback(() => {
    triggerHaptic(50);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTriageStep(0);
    } else {
      if (recognitionRef.current) recognitionRef.current.lang = i18n.language;
      recognitionRef.current?.start();
      setIsListening(true);
    }
  }, [isListening, triggerHaptic, i18n.language]);

  const handleCall = useCallback((phone: string) => { triggerHaptic(20); window.open(`tel:${phone}`); }, [triggerHaptic]);
  const handleExternalMap = useCallback((lat: number, lon: number) => { triggerHaptic(20); window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`); }, [triggerHaptic]);
  
  const handleNavigate = useCallback(async (service: Service) => {
    triggerHaptic(50);
    setSelectedService(service);
    if (location) {
      try {
        const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${location.lon},${location.lat};${service.lon},${service.lat}?overview=full&geometries=geojson`);
        const coords = res.data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setRouteCoordinates(coords);
        setViewMode('map');
      } catch (e) { console.error("Routing Error:", e); }
    }
  }, [location, triggerHaptic]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    triggerHaptic([100, 50, 100]);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await axios.post(`/api/triage?language=${i18n.language}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const analysis = res.data.analysis;
      setAiAnalysis(analysis);
      
      // Save to History
      const newEntry = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleString(),
        analysis: analysis
      };
      const updatedHistory = [newEntry, ...triageHistory.slice(0, 9)];
      setTriageHistory(updatedHistory);
      localStorage.setItem('roadsos_history', JSON.stringify(updatedHistory));
      
      triggerHaptic(200);
    } catch (err) { 
      console.error("AI Triage Error:", err);
      setError(t('ai_vision_failed')); 
    } finally { setIsAnalyzing(false); }
  }, [i18n.language, triggerHaptic, t, triageHistory]);

  const toggleVitalsMonitoring = useCallback(async () => {
    if (isMonitoringVitals) {
      setIsMonitoringVitals(false);
      setHeartRate(null);
      setVitalsHistory([]);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setIsMonitoringVitals(true);
      triggerHaptic(50);
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const samples: number[] = [];
      let lastTime = Date.now();
      const processFrame = () => {
        if (!isMounted.current || !stream.active) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          canvas.width = 100; canvas.height = 100;
          ctx.drawImage(video, 25, 25, 50, 50, 0, 0, 100, 100);
          const data = ctx.getImageData(0, 0, 100, 100).data;
          let greenSum = 0;
          for (let i = 1; i < data.length; i += 4) greenSum += data[i];
          samples.push(greenSum / (data.length / 4));
          if (samples.length > 150) samples.shift();
          const now = Date.now();
          if (now - lastTime > 2000 && samples.length > 60) {
            let peaks = 0; const mean = samples.reduce((a, b) => a + b) / samples.length;
            for (let i = 1; i < samples.length - 1; i++) {
              if (samples[i] > mean + 0.2 && samples[i] > samples[i-1] && samples[i] > samples[i+1]) peaks++;
            }
            const bpm = Math.round((peaks * 60) / (samples.length / 30));
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
  
  const sendAlerts = () => {
    if (contacts.length === 0) { setShowSettings(true); return; }
    const loc = location ? `https://www.google.com/maps?q=${location.lat},${location.lon}` : "Unknown";
    const link = trackingSessionId ? `${window.location.origin}/?track=${trackingSessionId}` : "";
    window.open(`sms:${contacts.join(';')}?body=${encodeURIComponent(`EMERGENCY SOS: Location: ${loc}. Track: ${link}`)}`);
  };

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
          <h1>ROADSoS <span style={{ fontSize: '0.6rem', background: 'var(--primary-red)', padding: '2px 6px', borderRadius: '4px' }}>{countryCode}</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isSupported && (
            <button className="theme-toggle" onClick={toggleListening} style={{ color: isListening ? 'var(--primary-red)' : 'inherit', animation: isSpeaking ? 'pulse 1s infinite' : 'none' }}>
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          )}
          <button className="theme-toggle" onClick={toggleVitalsMonitoring} style={{ color: isMonitoringVitals ? 'var(--primary-red)' : 'inherit' }}><Activity size={20} /></button>
          <button className="theme-toggle" onClick={() => setShowSettings(true)}><User size={20} /></button>
          <ThemeToggle />
        </div>
      </header>

      <main className="main-content">
        {error && <div className="error-banner"><AlertTriangle size={18} /><span>{error}</span></div>}

        <div className="sos-section">
          <div className="sos-button-wrapper">
            {!loading && <motion.div className="sos-ripple" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }} />}
            <motion.button className={`sos-button ${loading ? 'loading' : ''}`} onClick={() => { triggerHaptic([100, 50, 100]); getEmergencyServices(); }} disabled={loading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
              <AlertTriangle size={32} fill="white" /><span style={{ fontSize: '0.7rem', marginTop: 4 }}>{loading ? t('syncing') : t('sos')}</span>
            </motion.button>
          </div>
          <div className="sos-button-wrapper">
            <motion.button className={`sos-button ${isAnalyzing ? 'loading' : ''}`} style={{ width: '80px', height: '80px', background: 'var(--tab-active)', color: 'var(--text-main)', border: '1px solid var(--card-border)', boxShadow: 'none' }} onClick={() => document.getElementById('ai-camera-input')?.click()} disabled={isAnalyzing} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
              <Camera size={24} /><span style={{ fontSize: '0.5rem', marginTop: 4 }}>{isAnalyzing ? t('analyzing') : t('ai_vision')}</span>
            </motion.button>
            <input id="ai-camera-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>
        </div>

        <button className="btn btn-call" style={{ width: '100%', marginBottom: '1rem', borderRadius: '14px', padding: '15px', fontSize: '1rem' }} onClick={() => window.open(`tel:${emergencyConfig.combined || emergencyConfig.police}`)}>
          <Phone size={20} /> CALL LOCAL AUTHORITIES ({emergencyConfig.combined || emergencyConfig.police})
        </button>

        {contacts.length > 0 && (
          <button className="btn btn-nav" style={{ width: '100%', marginBottom: '1.5rem', borderRadius: '14px', padding: '12px' }} onClick={sendAlerts}>
            <MessageSquare size={18} /> {t('alert_contacts')}
          </button>
        )}

        <AnimatePresence>
          {aiAnalysis && (
            <motion.div className="first-aid-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ borderLeftColor: '#007aff', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#007aff', margin: 0, fontSize: '1rem' }}>{t('scene_analysis')}</h3>
                <button className="theme-toggle" onClick={() => setAiAnalysis(null)}><X size={16} /></button>
              </div>
              <div className="ai-report-content" style={{ fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{aiAnalysis}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMonitoringVitals && (
          <motion.div className="first-aid-card vitals-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ borderLeftColor: '#ff3b30', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#ff3b30', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} /> {t('vitals_monitor')}</h3>
              <div className="vitals-live-tag">{t('live_rppg')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '10px 0' }}>
              <div className="hr-display">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}><Heart size={32} fill="#ff3b30" color="#ff3b30" /></motion.div>
                <div style={{ textAlign: 'center' }}><span className="bpm-value">{heartRate || '--'}</span><span className="bpm-label">BPM</span></div>
              </div>
              <div className="vitals-graph">
                {vitalsHistory.map((h, i) => <motion.div key={i} className="graph-bar" initial={{ height: 0 }} animate={{ height: `${(h / 150) * 100}%` }} style={{ background: h > 100 ? '#ff3b30' : '#34c759' }} />)}
              </div>
            </div>
            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '1rem' }}><Zap size={10} /> {t('vitals_detail')}</p>
          </motion.div>
        )}

        <div className="category-bar">
          {CATEGORIES.map((cat, idx) => (
            <motion.div key={cat.id} className={`category-item ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => { triggerHaptic(10); setActiveCategory(cat.id); }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <cat.icon size={18} />{t(cat.label)}
            </motion.div>
          ))}
        </div>

        {activeCategory !== 'firstaid' && (
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /> {t('list')}</button>
            <button className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}><MapIcon size={16} /> {t('map')}</button>
          </div>
        )}

        <div className="content-area">
          {activeCategory === 'firstaid' ? (
            <div className="first-aid-list">
              <h2 style={{ marginBottom: '1rem' }}>{t('first_aid_title')}</h2>
              {FIRST_AID_DATA.map((item, idx) => (
                <div key={idx} className="first-aid-card">
                  <h4>{item.title}</h4><p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.scenario}</p>
                  <ol className="first-aid-steps">{item.steps.map((step, sIdx) => <li key={sIdx}>{step}</li>)}</ol>
                </div>
              ))}
            </div>
          ) : (
            <div className="services-container">
              <div className={`service-list-section ${viewMode === 'map' ? 'mobile-hidden' : ''}`}>
                <AnimatePresence mode="popLayout">
                  {filteredServices.length > 0 ? filteredServices.map((service, idx) => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                      idx={idx} 
                      t={t} 
                      selectedServiceId={selectedService?.id} 
                      onCall={handleCall} 
                      onNavigate={handleNavigate} 
                      onExternalMap={handleExternalMap} 
                    />
                  )) : (
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

      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
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
                    <option value="hi">हिन्दी (Hindi)</option><option value="as">অসমীয়া (Assamese)</option><option value="bn">বাংলা (Bengali)</option><option value="brx">बर' (Bodo)</option><option value="doi">डोगरी (Dogri)</option><option value="gu">ગુજરાતી (Gujarati)</option><option value="kn">ಕನ್ನಡ (Kannada)</option><option value="ks">کٲشُر (Kashmiri)</option><option value="kok">कोंकणी (Konkani)</option><option value="mai">मैथिली (Maithili)</option><option value="ml">മലയാളം (Malayalam)</option><option value="mni">মৈতৈলোন (Manipuri)</option><option value="mr">मराठी (Marathi)</option><option value="ne">नेपाली (Nepali)</option><option value="or">ଓଡ଼ିଆ (Odia)</option><option value="pa">ਪੰਜਾਬੀ (Punjabi)</option><option value="sa">संस्कृतम् (Sanskrit)</option><option value="sat">संताली (Santali)</option><option value="sd">सिंधी (Sindhi)</option><option value="ta">தமிழ் (Tamil)</option><option value="te">తెలుగు (Telugu)</option><option value="ur">اردो (Urdu)</option>
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
              {triageHistory.length > 0 && (
                <section className="settings-section" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--primary-red)' }}>{t('triage_history')}</h3>
                  {triageHistory.map(item => (
                    <div key={item.id} className="history-item" onClick={() => { setAiAnalysis(item.analysis); setShowSettings(false); }}>
                      <div className="history-date">{item.date}</div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.analysis.substring(0, 50)}...</div>
                    </div>
                  ))}
                  <button className="copy-btn" onClick={() => { setTriageHistory([]); localStorage.removeItem('roadsos_history'); }} style={{ color: 'var(--primary-red)', marginTop: '8px' }}>
                    {t('clear_history')}
                  </button>
                </section>
              )}
              <section className="settings-section" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--primary-red)' }}>{t('contacts')}</h3>
                {[0, 1, 2].map(idx => (
                  <input key={idx} type="tel" placeholder={`Contact ${idx + 1}`} className="contact-input" value={contacts[idx] || ''} onChange={(e) => { const newC = [...contacts]; newC[idx] = e.target.value; saveContacts(newC.filter(c => c !== '')); }} />
                ))}
              </section>
            </div>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}><button className="btn btn-call" style={{ width: '100%' }} onClick={() => setShowSettings(false)}>{t('save_close')}</button></div>
          </div>
        </div>
      )}
      <footer style={{ textAlign: 'center', padding: '2rem', fontSize: '0.7rem', opacity: 0.5 }}>ROADSoS GLOBAL EMERGENCY NETWORK © 2026</footer>
    </div>
  );
}

export default App;
