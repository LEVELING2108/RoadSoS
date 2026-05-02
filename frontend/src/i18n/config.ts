import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Global Locales
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

// Indian Locales
import hi from './locales/hi.json';
import as from './locales/as.json';
import bn from './locales/bn.json';
import brx from './locales/brx.json';
import doi from './locales/doi.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ks from './locales/ks.json';
import kok from './locales/kok.json';
import mai from './locales/mai.json';
import ml from './locales/ml.json';
import mni from './locales/mni.json';
import mr from './locales/mr.json';
import ne from './locales/ne.json';
import or from './locales/or.json';
import pa from './locales/pa.json';
import sa from './locales/sa.json';
import sat from './locales/sat.json';
import sd from './locales/sd.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import ur from './locales/ur.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      hi: { translation: hi },
      as: { translation: as },
      bn: { translation: bn },
      brx: { translation: brx },
      doi: { translation: doi },
      gu: { translation: gu },
      kn: { translation: kn },
      ks: { translation: ks },
      kok: { translation: kok },
      mai: { translation: mai },
      ml: { translation: ml },
      mni: { translation: mni },
      mr: { translation: mr },
      ne: { translation: ne },
      or: { translation: or },
      pa: { translation: pa },
      sa: { translation: sa },
      sat: { translation: sat },
      sd: { translation: sd },
      ta: { translation: ta },
      te: { translation: te },
      ur: { translation: ur }
    },
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;
