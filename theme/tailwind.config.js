/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        '../templates/**/*.html',
        '../**/templates/**/*.html',
        '../**/forms.py',
        '../**/models.py',
    ],
    theme: {
        extend: {
            colors: {
                'bolibana': {
                    50: '#F5F6F9',
                    100: '#E6E9F0',
                    200: '#C5CCD9',
                    300: '#9BA6BC',
                    400: '#6B7A99',
                    500: '#2B3A67',  // Couleur principale
                    600: '#25305A',
                    700: '#1F274D',
                    800: '#191E40',
                    900: '#131533',
                    950: '#0D0F26',
                },
                'gold': {
                    50: '#FFF9E6',
                    100: '#FFF2CC',
                    200: '#FFE699',
                    300: '#FFD966',
                    400: '#FFCD33',
                    500: '#FFD700',  // Couleur secondaire
                    600: '#E6C200',
                    700: '#CCAD00',
                    800: '#B39900',
                    900: '#998500',
                    950: '#806B00',
                },
                'forest': {
                    50: '#F0F7F3',
                    100: '#E1EFE7',
                    200: '#C3DFCF',
                    300: '#A5CFB7',
                    400: '#87BF9F',
                    500: '#2E8B57',  // Couleur tertiaire
                    600: '#297D4E',
                    700: '#246F45',
                    800: '#1F613C',
                    900: '#1A5333',
                    950: '#15452A',
                },
                'red': {
                    50: '#FEF2F2',
                    100: '#FEE2E2',
                    200: '#FECACA',
                    300: '#FCA5A5',
                    400: '#F87171',
                    500: '#EF4444',  // Couleur pour les actions de suppression
                    600: '#DC2626',
                    700: '#B91C1C',
                    800: '#991B1B',
                    900: '#7F1D1D',
                    950: '#450A0A',
                },
                'neutral': {
                    50: '#FFFFFF',
                    100: '#F5F5F5',  // Couleur neutre
                    200: '#E5E5E5',
                    300: '#D4D4D4',
                    400: '#A3A3A3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                    950: '#0A0A0A',
                },
            },
            fontFamily: {
                sans: ['Montserrat', 'system-ui', 'sans-serif'],
            },
            spacing: {
                '128': '32rem',
                '144': '36rem',
            },
            borderRadius: {
                '4xl': '2rem',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/aspect-ratio'),
    ],
} 