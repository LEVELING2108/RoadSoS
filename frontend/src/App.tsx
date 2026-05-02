import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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
  User,
  Mic,
  MicOff,
  Camera,
  Shield,
  Activity,
  Zap
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FIRST_AID_DATA } from './data/firstAid';
import { getEmergencyConfig } from './data/emergencyNumbers';
import type { EmergencyConfig } from './data/emergencyNumbers';
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
  is_recommended?: boolean;
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
  const { t, i18n } = useTranslation();
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

  useEffect(() => {
    isMounted.current = true;

    // Check speech support
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
          .join('')
          .toLowerCase();

        const trigger = t('sos').toLowerCase();
        if (transcript.includes(trigger) && triageStep === 0) {
          triggerHaptic([500, 200, 500]);
          startVoiceTriage();
        } else if (isListening && triageStep > 0) {
          if (transcript.length > 5) {
            proceedTriage();
          }
        }
      };

      recognition.onend = () => {
        if (isListening) recognition.start();
      };

      recognitionRef.current = recognition;
    }

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

    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track');
    if (trackId) {
      joinTrackingSession(trackId);
    }

    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws.current) ws.current.close();
    };
  }, [i18n.language]);

  const fetchRegionInfo = async (lat: number, lon: number) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const code = res.data.address.country_code.toUpperCase();
      setCountryCode(code);
      setEmergencyConfig(getEmergencyConfig(code));
    } catch (e) {
      console.error("Region detection error:", e);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceTriage = () => {
    setTriageStep(1);
    getEmergencyServices();
    speak(t('voice_sos_active'));
  };

  const proceedTriage = () => {
    if (triageStep === 1) {
      setTriageStep(2);
      speak(t('voice_step_1', { defaultValue: "Are you conscious and able to speak?" }));
    } else if (triageStep === 2) {
      setTriageStep(3);
      speak(t('voice_step_2', { defaultValue: "Are you currently alone, or is someone there with you?" }));
    } else if (triageStep === 3) {
      setTriageStep(4);
      speak(t('voice_step_3', { defaultValue: "Responders are on their way. Stay calm." }));
      setTimeout(() => setTriageStep(0), 10000);
    }
  };

  const toggleListening = () => {
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
  };

  const toggleVitalsMonitoring = async () => {
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
      
      let samples: number[] = [];
      let lastTime = Date.now();

      const processFrame = () => {
        if (!isMounted.current || !stream.active) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          canvas.width = 100;
          canvas.height = 100;
          ctx.drawImage(video, 25, 25, 50, 50, 0, 0, 100, 100);
          
          const imageData = ctx.getImageData(0, 0, 100, 100);
          const data = imageData.data;
          
          let greenSum = 0;
          for (let i = 1; i < data.length; i += 4) {
            greenSum += data[i];
          }
          const avgGreen = greenSum / (data.length / 4);
          
          samples.push(avgGreen);
          if (samples.length > 150) samples.shift();

          const now = Date.now();
          if (now - lastTime > 2000 && samples.length > 60) {
            let peaks = 0;
            const threshold = 0.2;
            const mean = samples.reduce((a, b) => a + b) / samples.length;
            
            for (let i = 1; i < samples.length - 1; i++) {
              if (samples[i] > mean + threshold && samples[i] > samples[i-1] && samples[i] > samples[i+1]) {
                peaks++;
              }
            }
            
            const bpm = Math.round((peaks * 60) / (samples.length / 30));
            if (bpm > 40 && bpm < 180) {
              setHeartRate(bpm);
              setVitalsHistory(prev => [...prev.slice(-20), bpm]);
            }
            lastTime = now;
          }
        }

        if (isMounted.current) requestAnimationFrame(processFrame);
        else {
          stream.getTracks().forEach(t => t.stop());
        }
      };

      requestAnimationFrame(processFrame);
    } catch (err) {
      console.error("Vitals Error:", err);
      setError(t('camera_blocked', { defaultValue: "CAMERA BLOCKED: Vitals monitoring requires front camera access." }));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setAiAnalysis(null);
    triggerHaptic([100, 50, 100]);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axios.post(`/api/triage?language=${i18n.language}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAiAnalysis(res.data.analysis);
      triggerHaptic(200);
    } catch (err: any) {
      console.error("AI Triage Error:", err);
      setError(err.response?.data?.detail || t('ai_vision_failed', { defaultValue: "AI Vision analysis failed. Ensure API key is configured." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const coords = response.data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
      setRouteCoordinates(coords);
    } catch (error) {
      console.error("Routing error:", error);
    }
  };

  const joinTrackingSession = (id: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : `${window.location.hostname}:8000`;
    const socket = new WebSocket(`${protocol}//${host}/ws/track/${id}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.lat && data.lon) {
        setLocation({ lat: data.lat, lon: data.lon });
        setViewMode('map');
        setError(t('tracking_active'));
      }
    };
    
    ws.current = socket;
    setTrackingSessionId(id);
  };

  const startTracking = async (lat: number, lon: number) => {
    try {
      const res = await axios.post('/api/create-session');
      const id = res.data.session_id;
      setTrackingSessionId(id);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : `${window.location.hostname}:8000`;
      const socket = new WebSocket(`${protocol}//${host}/ws/track/${id}`);
      
      socket.onopen = () => {
        socket.send(JSON.stringify({ lat, lon }));
      };
      
      ws.current = socket;

      if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition((pos) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ 
              lat: pos.coords.latitude, 
              lon: pos.coords.longitude 
            }));
          }
        });
      }
    } catch (e) {
      console.error("Failed to start tracking:", e);
    }
  };

  useEffect(() => {
    document.body.className = isDarkMode ? '' : 'light-mode';
    localStorage.setItem('roadsos_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const saveProfile = (newProfile: any) => {
    setProfile(newProfile);
    localStorage.setItem('roadsos_profile', JSON.stringify(newProfile));
  };

  const triggerHaptic = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const fetchLocation = () => {
    setError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMounted.current) {
            const newLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            setLocation(newLoc);
            fetchRegionInfo(newLoc.lat, newLoc.lon);
            setError(null);
          }
        },
        (err) => {
          console.error("Location Error:", err);
          if (isMounted.current) {
            if (err.code === err.PERMISSION_DENIED) {
              setError(t('location_blocked'));
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              setError(t('gps_lost'));
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
        startTracking(lat, lon);
        const contextParam = aiAnalysis ? `&context=${encodeURIComponent(aiAnalysis)}` : "";
        const res = await axios.get(`/api/emergency-services?lat=${lat}&lon=${lon}&radius=5000${contextParam}`);
        
        if (isMounted.current) {
          setServices(res.data.services);
          localStorage.setItem('roadsos_cache', JSON.stringify(res.data.services));
        }
      } catch {
        if (isMounted.current) {
          setError(isOffline ? t('offline_notice') : "Failed to sync with emergency network.");
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
            if (isMounted.current) {
              setLocation(newLoc);
              fetchRegionInfo(newLoc.lat, newLoc.lon);
            }
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
      return ['car_repair', 'motorcycle_repair', 'tyres', 'fuel', 'tow_truck', 'mechanic', 'breakdown_service', 'bicycle_repair_station', 'car', 'motorcycle'].includes(s.category);
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
    const trackingLink = trackingSessionId ? `${window.location.origin}/?track=${trackingSessionId}` : "";
    const message = encodeURIComponent(`EMERGENCY SOS: I need help! Location: ${locStr}. Track me live: ${trackingLink}`);
    const phoneList = contacts.join(';');
    window.open(`sms:${phoneList}?body=${message}`);
  };

  return (
    <div className={`app-container ${isDarkMode ? '' : 'light-mode'}`}>
      {isOffline && <div className="offline-notice">{t('offline_notice')}</div>}
      <AnimatePresence>
        {isListening && (
          <motion.div 
            className="offline-notice" 
            style={{ background: 'var(--primary-red)', color: 'white' }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
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
            <button 
              className="theme-toggle" 
              onClick={toggleListening} 
              style={{ color: isListening ? 'var(--primary-red)' : 'inherit', animation: isSpeaking ? 'pulse 1s infinite' : 'none' }}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          )}
          <button className="theme-toggle" onClick={toggleVitalsMonitoring} style={{ color: isMonitoringVitals ? 'var(--primary-red)' : 'inherit' }}>
            <Activity size={20} />
          </button>
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
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="sos-section">
          <div className="sos-button-wrapper">
            {!loading && (
              <motion.div className="sos-ripple" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }} />
            )}
            <motion.button 
              className={`sos-button ${loading ? 'loading' : ''}`} 
              onClick={() => { triggerHaptic([100, 50, 100]); getEmergencyServices(); }} 
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
            >
              <AlertTriangle size={32} fill="white" />
              <span style={{ fontSize: '0.7rem', marginTop: 4 }}>{loading ? t('syncing') : t('sos')}</span>
            </motion.button>
          </div>

          <div className="sos-button-wrapper">
            <motion.button 
              className={`sos-button ${isAnalyzing ? 'loading' : ''}`}
              style={{ width: '80px', height: '80px', background: 'var(--tab-active)', boxShadow: 'none' }}
              onClick={() => document.getElementById('ai-camera-input')?.click()}
              disabled={isAnalyzing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
            >
              <Camera size={24} />
              <span style={{ fontSize: '0.5rem', marginTop: 4 }}>{isAnalyzing ? t('analyzing') : t('ai_vision')}</span>
            </motion.button>
            <input id="ai-camera-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>
        </div>

        <button 
          className="btn btn-call" 
          style={{ width: '100%', marginBottom: '1rem', borderRadius: '14px', padding: '15px', fontSize: '1rem' }}
          onClick={() => window.open(`tel:${emergencyConfig.combined || emergencyConfig.police}`)}
        >
          <Phone size={20} /> CALL LOCAL AUTHORITIES ({emergencyConfig.combined || emergencyConfig.police})
        </button>

        {contacts.length > 0 && (
          <button className="btn btn-nav" style={{ width: '100%', marginBottom: '1.5rem', borderRadius: '14px', padding: '12px' }} onClick={sendAlerts}>
            <MessageSquare size={18} /> {t('alert_contacts')}
          </button>
        )}

        {aiAnalysis && (
          <motion.div className="first-aid-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ borderLeftColor: '#007aff', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#007aff', margin: 0, fontSize: '1rem' }}>{t('scene_analysis')}</h3>
              <button className="theme-toggle" onClick={() => setAiAnalysis(null)}><X size={16} /></button>
            </div>
            <div className="ai-report-content" style={{ fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{aiAnalysis}</div>
          </motion.div>
        )}

        {isMonitoringVitals && (
          <motion.div className="first-aid-card vitals-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ borderLeftColor: '#ff3b30', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#ff3b30', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} /> {t('vitals_monitor')}
              </h3>
              <div className="vitals-live-tag">{t('live_rppg')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '10px 0' }}>
              <div className="hr-display">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                  <Heart size={32} fill="#ff3b30" color="#ff3b30" />
                </motion.div>
                <div style={{ textAlign: 'center' }}>
                  <span className="bpm-value">{heartRate || '--'}</span>
                  <span className="bpm-label">BPM</span>
                </div>
              </div>
              <div className="vitals-graph">
                {vitalsHistory.map((h, i) => (
                  <motion.div key={i} className="graph-bar" initial={{ height: 0 }} animate={{ height: `${(h / 150) * 100}%` }} style={{ background: h > 100 ? '#ff3b30' : '#34c759' }} />
                ))}
              </div>
            </div>
            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '1rem' }}>
              <Zap size={10} /> {t('vitals_detail', { defaultValue: 'Extracting physiological data via micro-color facial analysis. Keep face visible.' })}
            </p>
          </motion.div>
        )}

        <div className="category-bar">
          {CATEGORIES.map((cat, idx) => (
            <motion.div key={cat.id} className={`category-item ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => { triggerHaptic(10); setActiveCategory(cat.id); }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <cat.icon size={18} />
              {t(cat.id === 'rescue' ? 'repairs' : cat.id === 'hospital' ? 'medical' : cat.id === 'police' ? 'security' : 'first_aid')}
            </motion.div>
          ))}
        </div>

        {activeCategory !== 'firstaid' && (
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /> {t('list', { defaultValue: 'List' })}</button>
            <button className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}><MapIcon size={16} /> {t('map', { defaultValue: 'Map' })}</button>
          </div>
        )}

        <div className="content-area">
          {activeCategory === 'firstaid' ? (
            <div className="first-aid-list">
              <h2 style={{ marginBottom: '1rem' }}>{t('first_aid_title')}</h2>
              {FIRST_AID_DATA.map((item, idx) => (
                <div key={idx} className="first-aid-card">
                  <h4>{item.title}</h4>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.scenario}</p>
                  <ol className="first-aid-steps">{item.steps.map((step, sIdx) => <li key={sIdx}>{step}</li>)}</ol>
                </div>
              ))}
            </div>
          ) : (
            <div className="services-container">
              <div className={`service-list-section ${viewMode === 'map' ? 'mobile-hidden' : ''}`}>
                <AnimatePresence mode="popLayout">
                  {filteredServices.length > 0 ? filteredServices.map((service, idx) => (
                    <motion.div key={service.id} className={`service-card ${service.is_recommended ? 'recommended-card' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }} layout>
                      {service.is_recommended && <div className="recommended-badge"><Shield size={12} fill="white" /> {t('recommended')}</div>}
                      <div className="service-img" style={service.image ? { backgroundImage: `url(${service.image})` } : {}}>{!service.image && <ImageIcon size={32} opacity={0.3} />}</div>
                      <div className="service-details">
                        <h3>{service.name}</h3>
                        <table className="detail-table">
                          <tbody>
                            <tr><td className="label">{t('location', { defaultValue: 'Location' })}</td><td className="value"><MapPin size={12} /> {service.address || 'GPS Coordinate'}</td></tr>
                            {service.opening_hours && <tr><td className="label">{t('hours', { defaultValue: 'Hours' })}</td><td className="value"><Clock size={12} /> {service.opening_hours}</td></tr>}
                            {service.phone && <tr><td className="label">{t('contact', { defaultValue: 'Contact' })}</td><td className="value"><Phone size={12} /> {service.phone}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      <div className="card-actions">
                        <button className="btn btn-call" onClick={() => { triggerHaptic(20); service.phone && window.open(`tel:${service.phone}`); }}><Phone size={16} /> {t('call', { defaultValue: 'CALL' })}</button>
                        <button className={`btn ${selectedService?.id === service.id ? 'btn-call' : 'btn-nav'}`} onClick={() => { triggerHaptic(50); setSelectedService(service); if (location) fetchRoute([location.lat, location.lon], [service.lat, service.lon]); setViewMode('map'); }}><Navigation size={16} /> {selectedService?.id === service.id ? t('syncing') : t('navigate')}</button>
                        <button className="btn btn-nav" onClick={() => { triggerHaptic(20); window.open(`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lon}`); }}><ImageIcon size={16} /> {t('external_map')}</button>
                      </div>
                    </motion.div>
                  )) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} style={{ textAlign: 'center', marginTop: '3rem' }}><p>{t('nearby_services')}</p><p>{t('refresh_data')}</p></motion.div>
                  )}
                </AnimatePresence>
              </div>
              {location && (
                <div className={`map-section ${viewMode === 'list' ? 'mobile-hidden' : ''}`}>
                  <div className="location-badge"><MapPin size={12} /> {location.lat.toFixed(5)}, {location.lon.toFixed(5)}</div>
                  <MapContainer center={[location.lat, location.lon]} zoom={14} scrollWheelZoom={false}>
                    <ChangeView center={[location.lat, location.lon]} />
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[location.lat, location.lon]} icon={UserIcon}><Popup>You are here</Popup></Marker>
                    {routeCoordinates.length > 0 && <Polyline positions={routeCoordinates} color="var(--primary-red)" weight={5} opacity={0.7} />}
                    {filteredServices.map(s => <Marker key={s.id} position={[s.lat, s.lon]}><Popup><strong>{s.name}</strong><br/>{s.category}</Popup></Marker>)}
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
              <h2>{t('settings')}</h2>
              <button className="theme-toggle" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <div className="settings-scroll-area">
              <section className="settings-section">
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--primary-red)' }}>Language / Idioma</h3>
                <select className="contact-input" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                  <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="hi">हिन्दी</option>
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
          </div>
        </div>
      )}
      <footer style={{ textAlign: 'center', padding: '2rem', fontSize: '0.7rem', opacity: 0.5 }}>ROADSoS GLOBAL EMERGENCY NETWORK © 2026</footer>
    </div>
  );
}

export default App;
