/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0d14',
          alt: '#11141d',
        },
        surface: {
          DEFAULT: '#161a25',
          2: '#1e2331',
        },
        text: {
          DEFAULT: '#f1f1f4',
          muted: '#9aa1b3',
          dim: '#5f6580',
        },
        border: {
          DEFAULT: '#232838',
          strong: '#2e3447',
        },
        accent: {
          DEFAULT: '#7553f6',
          hover: '#8967ff',
          soft: '#584774',
        },
        warning: {
          DEFAULT: '#ff7a59',
        },
        danger: {
          DEFAULT: '#f6827d',
        },
        success: {
          DEFAULT: '#5ee78a',
        },
      },
      fontFamily: {
        sans: ['Roobert', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        headline: ['Rubik', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '11': ['11px', '14px'],
        '12': ['12px', '16px'],
        '13': ['13px', '18px'],
        '15': ['15px', '22px'],
        '17': ['17px', '24px'],
        '20': ['20px', '28px'],
        '26': ['26px', '34px'],
        '34': ['34px', '42px'],
        '44': ['44px', '52px'],
        '56': ['56px', '64px'],
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '10px',
        modal: '12px',
      },
      boxShadow: {
        modal: '0 24px 48px rgba(0, 0, 0, 0.55)',
        'accent-ring': '0 0 0 2px #7553f6',
      },
    },
  },
  plugins: [],
};
