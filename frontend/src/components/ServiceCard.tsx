import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Navigation, MapPin, Clock, Shield, Image as ImageIcon, Copy, Check, ExternalLink } from 'lucide-react';

interface Service {
  id: number;
  name: string;
  category: string;
  phone?: string;
  address?: string;
  lat: number;
  lon: number;
  image?: string;
  opening_hours?: string;
  is_recommended?: boolean;
}

interface ServiceCardProps {
  service: Service;
  idx: number;
  t: (key: string, options?: any) => string;
  selectedServiceId?: number;
  onCall: (phone: string) => void;
  onNavigate: (service: Service) => void;
  onExternalMap: (lat: number, lon: number) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, idx, t, selectedServiceId, onCall, onNavigate, onExternalMap 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `${service.name}\n${service.address || 'GPS: ' + service.lat + ',' + service.lon}\nTel: ${service.phone || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      className={`service-card ${service.is_recommended ? 'recommended-card' : ''}`} 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, scale: 0.95 }} 
      transition={{ delay: idx * 0.05 }} 
      layout
    >
      {service.is_recommended && (
        <div className="recommended-badge">
          <Shield size={12} fill="white" /> {t('recommended')}
        </div>
      )}
      <div className="service-img" style={service.image ? { backgroundImage: `url(${service.image})` } : {}}>
        {!service.image && <ImageIcon size={32} opacity={0.3} />}
      </div>
      <div className="service-details">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3>{service.name}</h3>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? <Check size={14} color="#34c759" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <table className="detail-table">
          <tbody>
            <tr>
              <td className="label">{t('location')}</td>
              <td className="value"><MapPin size={12} /> {service.address || 'GPS Coordinate'}</td>
            </tr>
            {service.opening_hours && (
              <tr>
                <td className="label">{t('hours')}</td>
                <td className="value"><Clock size={12} /> {service.opening_hours}</td>
              </tr>
            )}
            {service.phone && (
              <tr>
                <td className="label">{t('contact')}</td>
                <td className="value"><Phone size={12} /> {service.phone}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card-actions">
        <div className="card-actions-row">
          <button className="btn btn-call" onClick={() => service.phone && onCall(service.phone)}>
            <Phone size={16} /> {t('call')}
          </button>
          <button 
            className={`btn ${selectedServiceId === service.id ? 'btn-call' : 'btn-nav'}`} 
            onClick={() => onNavigate(service)}
          >
            <Navigation size={16} /> {selectedServiceId === service.id ? t('syncing') : t('navigate')}
          </button>
        </div>
        <button className="btn btn-nav" style={{ width: '100%' }} onClick={() => onExternalMap(service.lat, service.lon)}>
          <ExternalLink size={16} /> {t('external_map')}
        </button>
      </div>
    </motion.div>
  );
};

export default React.memo(ServiceCard);
