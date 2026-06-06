import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- kept for backward compatibility ---
        ink: {
          950: '#07080a',
          900: '#0c0e12',
          850: '#11141a',
          800: '#161a22',
          700: '#1e2330',
          600: '#2a3042',
          500: '#3a4258',
          400: '#5a6278',
          300: '#8a93a8',
          200: '#b8bfd0',
          100: '#e6e9f0',
        },
        accent: {
          cyan: '#56d1ff',
          amber: '#f7b955',
          rose: '#ff6b8b',
          lime: '#9dff6b',
          violet: '#b47bff',
        },

        // --- new editorial palette ---
        // near-black stage with a quiet blue-grey warmth
        stage: {
          950: '#0a0c12',
          900: '#10131b',
          850: '#161925',
          800: '#1c2030',
          750: '#24293a',
          700: '#2a3042',
          600: '#3a4055',
          500: '#4f5671',
          400: '#6d7593',
          300: '#9098b4',
          200: '#c8ccdd',
        },
        // warm paper tones for text on dark — feels like an open journal, not a dashboard
        paper: {
          50: '#f7f2e5',
          100: '#ebe3d0',
          200: '#d4cab2',
          300: '#a89f88',
          400: '#7a7364',
          500: '#55503f',
        },
        // all domain-meaning colors live under "catalytic" so they read intentionally
        catalytic: {
          gold: '#e8b86d',      // active / catalytic residue
          terra: '#d4613a',     // substrate / nucleophile
          sage: '#7ba8a3',      // water / H-bond partner
          verdigris: '#4e9e8c', // allosteric pathway
          plum: '#8b5a9f',      // mutation / delta
          sand: '#c4a775',      // neutral secondary highlight
          rust: '#a1421a',      // destructive / error
        },
      },
      fontFamily: {
        display: ['"Fraunces"', '"Spectral"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': '0.6875rem',
      },
      letterSpacing: {
        'widest-plus': '0.22em',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 30px -18px rgba(0,0,0,0.6)',
        lift: '0 18px 48px -28px rgba(0,0,0,0.75)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'grain': 'grain 8s steps(10) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%': { transform: 'translate(-3%, -2%)' },
          '30%': { transform: 'translate(1%, 3%)' },
          '50%': { transform: 'translate(-2%, 2%)' },
          '70%': { transform: 'translate(3%, -1%)' },
          '90%': { transform: 'translate(-1%, 1%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
