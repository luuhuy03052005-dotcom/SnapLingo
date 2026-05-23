/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'sans-serif']
      },
      colors: {
        /* Trust Blue — Primary action color */
        primary: {
          DEFAULT: '#004F96',
          container: '#0067C0',
          'on': '#ffffff',
          'on-container': '#dbe7ff',
          fixed: '#d5e3ff',
          'fixed-dim': '#a6c8ff',
          'on-fixed': '#001c3b',
          50: '#f0f6ff',
          100: '#d5e3ff',
          200: '#a6c8ff',
          500: '#0067C0',
          600: '#004F96',
          700: '#004787'
        },
        /* Privacy Teal — Security accent */
        teal: {
          DEFAULT: '#006970',
          container: '#7af1fd',
          'on': '#ffffff',
          'on-container': '#006e75',
          fixed: '#80f4ff',
          'fixed-dim': '#5ed7e3',
          50: '#edfeff',
          200: '#80f4ff',
          500: '#006970',
          600: '#004f55'
        },
        /* Tertiary — Warm accent */
        tertiary: {
          DEFAULT: '#833900',
          container: '#a84c00',
          'on': '#ffffff'
        },
        /* Surface system — Light mode foundation */
        surface: {
          DEFAULT: '#f9f9f9',
          dim: '#dadada',
          bright: '#f9f9f9',
          'container-lowest': '#ffffff',
          'container-low': '#f3f3f3',
          container: '#eeeeee',
          'container-high': '#e8e8e8',
          'container-highest': '#e2e2e2',
          variant: '#e2e2e2',
          tint: '#005eb1'
        },
        'on-surface': {
          DEFAULT: '#1a1c1c',
          variant: '#414752'
        },
        'inverse-surface': '#2f3131',
        'inverse-on-surface': '#f1f1f1',
        outline: {
          DEFAULT: '#717783',
          variant: '#c1c6d4'
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          'on': '#ffffff',
          'on-container': '#93000a'
        },
        background: '#f9f9f9',
        'on-background': '#1a1c1c'
      },
      boxShadow: {
        'rest': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'overlay': '0 8px 24px rgba(0, 0, 0, 0.14)',
        'card': '0 1px 2px rgba(0, 0, 0, 0.06)'
      },
      borderRadius: {
        'fluent-sm': '0.25rem',
        'fluent': '0.375rem',
        'fluent-lg': '0.5rem',
        'fluent-xl': '0.75rem'
      },
      spacing: {
        'sidebar': '200px',
        'sidebar-mini': '48px'
      }
    }
  },
  plugins: []
}
