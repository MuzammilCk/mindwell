/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            },
            colors: {
                davinci: {
                    bg: '#050511',
                    card: 'rgba(255, 255, 255, 0.03)',
                    border: 'rgba(255, 255, 255, 0.08)',
                    accent: '#7000FF', // Neon purple
                    text: '#ffffff',
                    muted: '#888899',
                }
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 10px rgba(112, 0, 255, 0.2)' },
                    '100%': { boxShadow: '0 0 30px rgba(112, 0, 255, 0.6)' },
                }
            }
        },
    },
    plugins: [],
}
