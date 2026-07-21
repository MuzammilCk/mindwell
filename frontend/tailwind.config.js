/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['DM Serif Display', 'Playfair Display', 'serif'],
            },
            colors: {
                mindwell: {
                    bg: '#06060e',
                    surface: '#0c0c1a',
                    card: 'rgba(255, 255, 255, 0.03)',
                    border: 'rgba(255, 255, 255, 0.06)',
                    violet: {
                        DEFAULT: '#8b5cf6',
                        dim: '#6d28d9',
                        glow: 'rgba(139, 92, 246, 0.4)',
                    },
                    teal: {
                        DEFAULT: '#2dd4bf',
                        dim: '#0d9488',
                        glow: 'rgba(45, 212, 191, 0.4)',
                    },
                    rose: {
                        DEFAULT: '#fb7185',
                        glow: 'rgba(251, 113, 133, 0.4)',
                    },
                    muted: '#64748b',
                    text: '#e2e8f0',
                },
            },
            animation: {
                'breathe': 'breathe 4s ease-in-out infinite',
                'breathe-fast': 'breathe 2s ease-in-out infinite',
                'ripple': 'ripple 2s ease-out infinite',
                'ripple-delay': 'ripple 2s ease-out 0.5s infinite',
                'ripple-delay-2': 'ripple 2s ease-out 1s infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
                'aurora': 'aurora 15s ease-in-out infinite alternate',
                'spin-slow': 'spin 8s linear infinite',
                'waveform': 'waveform 0.5s ease-in-out infinite alternate',
            },
            keyframes: {
                breathe: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
                    '50%': { transform: 'scale(1.08)', opacity: '1' },
                },
                ripple: {
                    '0%': { transform: 'scale(1)', opacity: '0.6' },
                    '100%': { transform: 'scale(2.5)', opacity: '0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                'glow-pulse': {
                    '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)' },
                    '100%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.35)' },
                },
                aurora: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                waveform: {
                    '0%': { transform: 'scaleY(0.4)' },
                    '100%': { transform: 'scaleY(1)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
