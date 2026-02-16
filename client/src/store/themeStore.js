import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
    persist(
        (set) => ({
            currentTheme: 'default', // 'default', 'light', 'midnight', 'cyberpunk'
            setTheme: (theme) => set({ currentTheme: theme }),
        }),
        {
            name: 'theme-storage',
        }
    )
);

export default useThemeStore;
