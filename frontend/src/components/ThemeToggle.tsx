import React, { useEffect, useState, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('roadsos_theme') !== 'light';
  });

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('roadsos_theme', newMode ? 'dark' : 'light');
      document.body.className = newMode ? '' : 'light-mode';
      return newMode;
    });
  }, []);

  useEffect(() => {
    // Sync initial state
    document.body.className = isDarkMode ? '' : 'light-mode';
  }, [isDarkMode]);

  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

export default React.memo(ThemeToggle);
