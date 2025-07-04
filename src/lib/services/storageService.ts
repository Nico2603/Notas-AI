import { Theme, Templates, HistoricNote } from '../../types';
import { DEFAULT_TEMPLATES } from '../constants';

const THEME_KEY = 'notasai_theme';
const TEMPLATES_KEY = 'notasai_templates';
const HISTORY_KEY = 'notasai_history';

// User-specific storage keys
const getUserTemplatesKey = (userId: string): string => `notasai_templates_${userId}`;
const getUserHistoryKey = (userId: string): string => `notasai_history_${userId}`;

// Safe localStorage wrapper for SSR compatibility
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
};

export const getThemePreference = (): Theme => {
  const storedTheme = safeLocalStorage.getItem(THEME_KEY) as Theme | null;
  return storedTheme || Theme.Light; // Default to light theme
};

export const setThemePreference = (theme: Theme): void => {
  safeLocalStorage.setItem(THEME_KEY, theme);
};

export const getStoredTemplates = (): Templates => {
  const storedTemplates = safeLocalStorage.getItem(TEMPLATES_KEY);
  if (storedTemplates) {
    try {
      return JSON.parse(storedTemplates);
    } catch (error) {
      console.error("Failed to parse stored templates:", error);
      // Fallback to default if parsing fails
      return { ...DEFAULT_TEMPLATES };
    }
  }
  return { ...DEFAULT_TEMPLATES }; // Return a copy to avoid mutation
};

export const saveTemplates = (templates: Templates): void => {
  try {
    safeLocalStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("Failed to save templates:", error);
  }
};

export const getStoredHistoricNotes = (): HistoricNote[] => {
  const storedHistory = safeLocalStorage.getItem(HISTORY_KEY);
  if (storedHistory) {
    try {
      return JSON.parse(storedHistory);
    } catch (error) {
      console.error("Failed to parse stored historic notes:", error);
      return [];
    }
  }
  return [];
};

export const saveHistoricNotes = (notes: HistoricNote[]): void => {
  try {
    safeLocalStorage.setItem(HISTORY_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Failed to save historic notes:", error);
  }
};

// Helper to add a new note and save, keeping a reasonable limit (e.g., last 50 notes)
export const addHistoricNoteEntry = (newNote: HistoricNote): HistoricNote[] => {
  let notes = getStoredHistoricNotes();
  notes.unshift(newNote); // Add to the beginning
  if (notes.length > 50) { // Keep only the last 50 notes
    notes = notes.slice(0, 50);
  }
  saveHistoricNotes(notes);
  return notes;
};

// User-specific storage functions
export const getUserStoredTemplates = (userId: string): Templates => {
  const storedTemplates = safeLocalStorage.getItem(getUserTemplatesKey(userId));
  if (storedTemplates) {
    try {
      return JSON.parse(storedTemplates);
    } catch (error) {
      console.error("Failed to parse stored user templates:", error);
      return { ...DEFAULT_TEMPLATES };
    }
  }
  return { ...DEFAULT_TEMPLATES };
};

export const saveUserTemplates = (userId: string, templates: Templates): void => {
  try {
    safeLocalStorage.setItem(getUserTemplatesKey(userId), JSON.stringify(templates));
  } catch (error) {
    console.error("Failed to save user templates:", error);
  }
};

export const getUserStoredHistoricNotes = (userId: string): HistoricNote[] => {
  const storedHistory = safeLocalStorage.getItem(getUserHistoryKey(userId));
  if (storedHistory) {
    try {
      return JSON.parse(storedHistory);
    } catch (error) {
      console.error("Failed to parse stored user historic notes:", error);
      return [];
    }
  }
  return [];
};

export const saveUserHistoricNotes = (userId: string, notes: HistoricNote[]): void => {
  try {
    safeLocalStorage.setItem(getUserHistoryKey(userId), JSON.stringify(notes));
  } catch (error) {
    console.error("Failed to save user historic notes:", error);
  }
};

export const addUserHistoricNoteEntry = (userId: string, newNote: HistoricNote): HistoricNote[] => {
  let notes = getUserStoredHistoricNotes(userId);
  notes.unshift(newNote); // Add to the beginning
  if (notes.length > 50) { // Keep only the last 50 notes
    notes = notes.slice(0, 50);
  }
  saveUserHistoricNotes(userId, notes);
  return notes;
};

// Utility function to clear user data (for logout)
export const clearUserData = (userId: string): void => {
  safeLocalStorage.removeItem(getUserTemplatesKey(userId));
  safeLocalStorage.removeItem(getUserHistoryKey(userId));
};
