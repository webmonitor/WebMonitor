export const LANGUAGE_STORAGE_KEY = 'webmonitor-language';

export const normalizeLanguage = (language) => {
  if (!language) {
    return 'en';
  }

  const normalized = language.toLowerCase();

  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en';
};

export const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (storedLanguage) {
    return normalizeLanguage(storedLanguage);
  }

  return normalizeLanguage(window.navigator.language || window.navigator.userLanguage);
};
