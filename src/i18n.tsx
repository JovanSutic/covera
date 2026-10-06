import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";

i18next
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // 1. Explicitly allow exact language keys
    supportedLngs: ["en", "de", "tr", "sr-Latn"],
    
    // 2. DISABLE nonExplicitSupportedLngs so i18next stops stripping '-Latn'
    nonExplicitSupportedLngs: false,

    // 3. Ensure exact string lookup for folder paths (/locales/sr-Latn/general.json)
    load: "currentOnly",
    lowerCaseLng: false,

    fallbackLng: "en",
    debug: process.env.NODE_ENV === "development",

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",

      // Intercept browser languages (e.g. 'sr', 'sr-RS', 'sr-ME') and force 'sr-Latn'
      convertDetectedLanguage: (lng) => {
        if (!lng) return "en";
        if (lng.toLowerCase().startsWith("sr")) {
          return "sr-Latn";
        }
        return lng;
      },
    },

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;