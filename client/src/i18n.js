import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import hiTranslation from './locales/hi.json';
import taTranslation from './locales/ta.json';

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem('medi_buddy_language');
    if (saved && ['en', 'hi', 'ta'].includes(saved)) {
      return saved;
    }
    const userSession = localStorage.getItem('medi_buddy_auth_user');
    if (userSession) {
      const parsed = JSON.parse(userSession);
      if (parsed?.language && ['en', 'hi', 'ta'].includes(parsed.language)) {
        return parsed.language;
      }
    }
  } catch (e) {
    console.warn('Error reading stored language preference:', e);
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation },
      ta: { translation: taTranslation }
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safely handles XSS
    },
    react: {
      useSuspense: false // Avoid hydration flash or suspense delay
    }
  });

export default i18n;
