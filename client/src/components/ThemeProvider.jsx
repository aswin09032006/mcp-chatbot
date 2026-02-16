import { useEffect } from 'react';
import useThemeStore from '../store/themeStore';

const themes = {
    default: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#0a0a0b',
        '--color-text-primary': '#e2e2e2',
        '--color-text-secondary': '#a1a1a1',
        '--border-color': '#161617',
        '--accent-color': '#0090ff',
        '--guide-color': 'rgba(229, 231, 235, 0.1)',
        '--card-bg': 'rgba(255, 255, 255, 0.03)',
        '--msg-user-bg': '#1f1f1f',
        '--msg-bot-bg': 'transparent',
        '--grid-color': 'rgba(255, 255, 255, 0.05)',
        '--gradient-start': '#000000',
        '--gradient-end': '#0a0a0b',
    },
    light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f3f4f6', // Gray-100
        '--color-text-primary': '#111827', // Gray-900
        '--color-text-secondary': '#4b5563', // Gray-600
        '--border-color': '#e5e7eb', // Gray-200
        '--accent-color': '#2563eb', // Blue-600
        '--guide-color': 'rgba(0, 0, 0, 0.05)',
        '--card-bg': '#ffffff',
        '--msg-user-bg': '#e5e7eb',
        '--msg-bot-bg': 'transparent',
        '--grid-color': 'rgba(0, 0, 0, 0.05)',
        '--gradient-start': '#ffffff',
        '--gradient-end': '#f9fafb',
    },
};

const ThemeProvider = ({ children }) => {
    const { currentTheme } = useThemeStore();

    useEffect(() => {
        const root = document.documentElement;
        const theme = themes[currentTheme] || themes.default;

        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

    }, [currentTheme]);

    return children;
};

export default ThemeProvider;
