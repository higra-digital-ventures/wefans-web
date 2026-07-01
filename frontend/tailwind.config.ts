import type { Config } from 'tailwindcss';

// Tokens de marca wefans — paleta "Miami underground" (seção 11.1 do brief).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        accent3: 'var(--accent3)',
        tier: {
          comum: '#8b8194',
          torcida: '#21d4e0',
          raro: '#9d4edd',
          lendario: '#ff9e2c',
          galactico: '#ff2e88',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-text)',
        mono: 'var(--font-mono)',
      },
      backgroundImage: {
        sunset: 'linear-gradient(120deg,#ff2e88,#9d4edd,#3a1e6e)',
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(255,46,136,.35), 0 0 24px rgba(255,46,136,.25)',
      },
    },
  },
  plugins: [],
};

export default config;
