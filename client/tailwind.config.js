/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Preserving existing for backward compatibility if needed, but prioritizing Creozen
                dark: '#0a0a0b',
                'dark-secondary': '#121214',
                'glass-border': 'rgba(255, 255, 255, 0.08)',
                'glass-bg': 'rgba(255, 255, 255, 0.03)',
                accent: '#8b5cf6',

                // Creozen Exact Palette
                // Creozen Exact Palette - Flattened for safety
                'creozen-bg': 'var(--bg-primary)',
                'creozen-card': 'var(--bg-secondary)', // Using bg-secondary for general cards, specific ones might use --card-bg
                'creozen-border': 'var(--border-color)',
                'creozen-guide': 'var(--guide-color)',
                'creozen-text-primary': 'var(--color-text-primary)',
                'creozen-text-muted': 'var(--color-text-secondary)',
                'creozen-accent-blue': 'var(--accent-color)',
                'creozen-accent-red': '#e5484d', // Keep for now or make variable if needed
                'creozen-accent-green': '#0c9784', // Keep for now
            },
            fontFamily: {
                sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'grid-pattern': 'linear-gradient(to right, var(--grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)',
                'cortex-gradient': 'linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spotlight': 'spotlight 2s ease .75s 1 forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                spotlight: {
                    '0%': { opacity: 0, transform: 'translate(-72%, -62%) scale(0.5)' },
                    '100%': { opacity: 1, transform: 'translate(-50%,-40%) scale(1)' },
                }
            },
        },
    },
    plugins: [],
}
