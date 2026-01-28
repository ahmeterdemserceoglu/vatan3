/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                matte: {
                    bg: '#f5f5f4',        // stone-100
                    surface: '#fafaf9',   // stone-50
                    card: '#ffffff',
                    border: '#e7e5e4',    // stone-200
                    text: '#292524',      // stone-800
                    muted: '#78716c',     // stone-500
                    accent: '#57534e',    // stone-600
                },
                note: {
                    yellow: '#fef3c7',    // amber-100 (pastel)
                    blue: '#dbeafe',      // blue-100 (pastel)
                    green: '#dcfce7',     // green-100 (pastel)
                    pink: '#fce7f3',      // pink-100 (pastel)
                    purple: '#f3e8ff',    // purple-100 (pastel)
                    orange: '#ffedd5',    // orange-100 (pastel)
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'matte': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
                'matte-md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                'matte-lg': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
