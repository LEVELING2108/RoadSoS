export interface EmergencyConfig {
  police: string;
  ambulance: string;
  fire: string;
  combined?: string;
  countryName: string;
}

export const EMERGENCY_NUMBERS: Record<string, EmergencyConfig> = {
  US: { police: '911', ambulance: '911', fire: '911', combined: '911', countryName: 'United States' },
  GB: { police: '999', ambulance: '999', fire: '999', combined: '999', countryName: 'United Kingdom' },
  IN: { police: '100', ambulance: '102', fire: '101', combined: '112', countryName: 'India' },
  ES: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Spain' },
  FR: { police: '17', ambulance: '15', fire: '18', combined: '112', countryName: 'France' },
  DE: { police: '110', ambulance: '112', fire: '112', combined: '112', countryName: 'Germany' },
  AU: { police: '000', ambulance: '000', fire: '000', combined: '000', countryName: 'Australia' },
  CA: { police: '911', ambulance: '911', fire: '911', combined: '911', countryName: 'Canada' },
  BR: { police: '190', ambulance: '192', fire: '193', combined: '190', countryName: 'Brazil' },
  JP: { police: '110', ambulance: '119', fire: '119', combined: '110', countryName: 'Japan' },
  // Default fallback
  DEFAULT: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Global' }
};

export const getEmergencyConfig = (countryCode?: string): EmergencyConfig => {
  return EMERGENCY_NUMBERS[countryCode?.toUpperCase() || 'DEFAULT'] || EMERGENCY_NUMBERS['DEFAULT'];
};
