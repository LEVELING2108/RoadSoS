import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Navigation, MapPin, Clock, Shield, Image as ImageIcon } from 'lucide-react';

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
        <h3>{service.name}</h3>
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
        <button className="btn btn-call" onClick={() => service.phone && onCall(service.phone)}>
          <Phone size={16} /> {t('call')}
        </button>
        <button 
          className={`btn ${selectedServiceId === service.id ? 'btn-call' : 'btn-nav'}`} 
          onClick={() => onNavigate(service)}
        >
          <Navigation size={16} /> {selectedServiceId === service.id ? t('syncing') : t('navigate')}
        </button>
        <button className="btn btn-nav" onClick={() => onExternalMap(service.lat, service.lon)}>
          <ImageIcon size={16} /> {t('external_map')}
        </button>
      </div>
    </motion.div>
  );
};

export default React.memo(ServiceCard);
