import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, DARK_THEME, LIGHT_THEME } from '../constants/themes';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (themeName: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@i_activ_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(DARK_THEME);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setCurrentTheme(savedTheme === 'light' ? LIGHT_THEME : DARK_THEME);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du thème:', error);
    }
  };

  const saveTheme = async (themeName: 'dark' | 'light') => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme.name === 'dark' ? LIGHT_THEME : DARK_THEME;
    setCurrentTheme(newTheme);
    saveTheme(newTheme.name);
  };

  const setTheme = (themeName: 'dark' | 'light') => {
    const newTheme = themeName === 'light' ? LIGHT_THEME : DARK_THEME;
    setCurrentTheme(newTheme);
    saveTheme(themeName);
  };

  const value: ThemeContextType = {
    theme: currentTheme,
    isDark: currentTheme.name === 'dark',
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 