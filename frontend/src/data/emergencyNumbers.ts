export interface EmergencyConfig {
  police: string;
  ambulance: string;
  fire: string;
  combined?: string;
  countryName: string;
}

export const EMERGENCY_NUMBERS: Record<string, EmergencyConfig> = {
  // --- North America ---
  US: { police: '911', ambulance: '911', fire: '911', combined: '911', countryName: 'United States' },
  CA: { police: '911', ambulance: '911', fire: '911', combined: '911', countryName: 'Canada' },
  MX: { police: '911', ambulance: '911', fire: '911', combined: '911', countryName: 'Mexico' },

  // --- Europe (Most use 112) ---
  GB: { police: '999', ambulance: '999', fire: '999', combined: '999', countryName: 'United Kingdom' },
  IE: { police: '999', ambulance: '999', fire: '999', combined: '112', countryName: 'Ireland' },
  FR: { police: '17', ambulance: '15', fire: '18', combined: '112', countryName: 'France' },
  DE: { police: '110', ambulance: '112', fire: '112', combined: '112', countryName: 'Germany' },
  IT: { police: '113', ambulance: '118', fire: '115', combined: '112', countryName: 'Italy' },
  ES: { police: '091', ambulance: '061', fire: '080', combined: '112', countryName: 'Spain' },
  PT: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Portugal' },
  CH: { police: '117', ambulance: '144', fire: '118', combined: '112', countryName: 'Switzerland' },
  AT: { police: '133', ambulance: '144', fire: '122', combined: '112', countryName: 'Austria' },
  BE: { police: '101', ambulance: '100', fire: '100', combined: '112', countryName: 'Belgium' },
  NL: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Netherlands' },
  SE: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Sweden' },
  NO: { police: '112', ambulance: '113', fire: '110', combined: '112', countryName: 'Norway' },
  DK: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Denmark' },
  FI: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Finland' },
  GR: { police: '100', ambulance: '166', fire: '199', combined: '112', countryName: 'Greece' },
  TR: { police: '155', ambulance: '112', fire: '110', combined: '112', countryName: 'Turkey' },
  PL: { police: '997', ambulance: '999', fire: '998', combined: '112', countryName: 'Poland' },
  UA: { police: '102', ambulance: '103', fire: '101', combined: '112', countryName: 'Ukraine' },

  // --- Asia ---
  IN: { police: '100', ambulance: '102', fire: '101', combined: '112', countryName: 'India' },
  CN: { police: '110', ambulance: '120', fire: '119', combined: '120', countryName: 'China' },
  JP: { police: '110', ambulance: '119', fire: '119', combined: '110', countryName: 'Japan' },
  KR: { police: '112', ambulance: '119', fire: '119', combined: '112', countryName: 'South Korea' },
  SG: { police: '999', ambulance: '995', fire: '995', combined: '995', countryName: 'Singapore' },
  MY: { police: '999', ambulance: '999', fire: '999', combined: '999', countryName: 'Malaysia' },
  TH: { police: '191', ambulance: '1669', fire: '199', combined: '191', countryName: 'Thailand' },
  ID: { police: '110', ambulance: '118', fire: '113', combined: '112', countryName: 'Indonesia' },
  VN: { police: '113', ambulance: '115', fire: '114', combined: '113', countryName: 'Vietnam' },
  PH: { police: '911', ambulance: '911', fire: '911', combined: '911', countryName: 'Philippines' },
  AE: { police: '999', ambulance: '998', fire: '997', combined: '999', countryName: 'United Arab Emirates' },
  SA: { police: '999', ambulance: '997', fire: '998', combined: '911', countryName: 'Saudi Arabia' },
  IL: { police: '100', ambulance: '101', fire: '102', combined: '100', countryName: 'Israel' },

  // --- Oceania ---
  AU: { police: '000', ambulance: '000', fire: '000', combined: '000', countryName: 'Australia' },
  NZ: { police: '111', ambulance: '111', fire: '111', combined: '111', countryName: 'New Zealand' },

  // --- Africa ---
  ZA: { police: '10111', ambulance: '10177', fire: '10177', combined: '112', countryName: 'South Africa' },
  EG: { police: '122', ambulance: '123', fire: '180', combined: '122', countryName: 'Egypt' },
  NG: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Nigeria' },
  KE: { police: '999', ambulance: '999', fire: '999', combined: '112', countryName: 'Kenya' },
  MA: { police: '19', ambulance: '15', fire: '15', combined: '112', countryName: 'Morocco' },

  // --- South America ---
  BR: { police: '190', ambulance: '192', fire: '193', combined: '190', countryName: 'Brazil' },
  AR: { police: '101', ambulance: '107', fire: '100', combined: '911', countryName: 'Argentina' },
  CL: { police: '133', ambulance: '131', fire: '132', combined: '133', countryName: 'Chile' },
  CO: { police: '123', ambulance: '123', fire: '123', combined: '123', countryName: 'Colombia' },
  PE: { police: '105', ambulance: '117', fire: '116', combined: '911', countryName: 'Peru' },

  // Default fallback
  DEFAULT: { police: '112', ambulance: '112', fire: '112', combined: '112', countryName: 'Global' }
};

export const getEmergencyConfig = (countryCode?: string): EmergencyConfig => {
  const code = countryCode?.toUpperCase() || 'DEFAULT';
  return EMERGENCY_NUMBERS[code] || EMERGENCY_NUMBERS['DEFAULT'];
};
