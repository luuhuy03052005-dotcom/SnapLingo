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
      /**
       * Typography tokens matching DESIGN.md spec.
       * Why: The design system uses semantic font sizes (body-lg, label-bold, caption)
       * instead of arbitrary px values. This keeps text hierarchy consistent.
       */
      fontSize: {
        'display': ['40px', { lineHeight: '52px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-bold': ['12px', { lineHeight: '16px', fontWeight: '700' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }]
      },
      colors: {
        /* Trust Blue — Primary action color */
        primary: {
          DEFAULT: '#00386e',
          container: '#004f96',
          'on': '#ffffff',
          'on-container': '#9dc3ff',
          fixed: '#d5e3ff',
          'fixed-dim': '#a7c8ff',
          'on-fixed': '#001c3b',
          'on-fixed-variant': '#004787',
          50: '#f0f6ff',
          100: '#d5e3ff',
          200: '#a7c8ff',
          500: '#004f96',
          600: '#00386e',
          700: '#004787'
        },
        /* Secondary — Privacy Teal */
        secondary: {
          DEFAULT: '#006970',
          container: '#9eedf4',
          'on': '#ffffff',
          'on-container': '#0c6d74',
          fixed: '#a1eff7',
          'fixed-dim': '#85d3db',
          'on-fixed': '#002022',
          'on-fixed-variant': '#004f54'
        },
        /* Tertiary — Warm accent */
        tertiary: {
          DEFAULT: '#5f2800',
          container: '#833900',
          'on': '#ffffff',
          'on-container': '#ffae80',
          fixed: '#ffdbca',
          'fixed-dim': '#ffb68e',
          'on-fixed': '#331200',
          'on-fixed-variant': '#763300'
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
          tint: '#215fa7'
        },
        'on-surface': {
          DEFAULT: '#1a1c1c',
          variant: '#424751'
        },
        'inverse-surface': '#2f3131',
        'inverse-on-surface': '#f1f1f1',
        'inverse-primary': '#a7c8ff',
        outline: {
          DEFAULT: '#727782',
          variant: '#c2c6d2'
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          'on': '#ffffff',
          'on-container': '#93000a'
        },
        background: '#f9f9f9',
        'on-background': '#1a1c1c',

        /**
         * POS Token colors — Pastel backgrounds + dark text for Part-of-Speech chips.
         * Why: Each POS category needs distinct but non-aggressive coloring.
         * The design spec uses Material-adjacent pastel tones for readability.
         */
        'pos-noun-bg': '#FFE4E6',
        'pos-noun-text': '#881337',
        'pos-verb-bg': '#D1FAE5',
        'pos-verb-text': '#064E3B',
        'pos-adj-bg': '#E0F2FE',
        'pos-adj-text': '#0C4A6E',
        'pos-adv-bg': '#FEF3C7',
        'pos-adv-text': '#78350F',
        'pos-other-bg': '#F3F4F6',
        'pos-other-text': '#374151'
      },
      boxShadow: {
        'rest': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'overlay': '0 8px 24px rgba(0, 0, 0, 0.14)',
        'card': '0 1px 2px rgba(0, 0, 0, 0.06)',
        'float': '0 8px 24px rgba(0, 0, 0, 0.15)',
        'float-hover': '0 12px 32px rgba(0, 0, 0, 0.2)',
        'fab': '0px 4px 12px rgba(0, 0, 0, 0.1)'
      },
      borderRadius: {
        'DEFAULT': '0.125rem',
        'sm': '0.125rem',
        'md': '0.375rem',
        'lg': '0.25rem',
        'xl': '0.5rem',
        'fluent': '0.375rem',
        'fluent-xl': '0.75rem',
        'full': '9999px'
      },
      spacing: {
        'sidebar': '240px',
        'sidebar-mini': '48px',
        'unit': '4px',
        'xs': '4px',
        'sm-space': '8px',
        'md-space': '16px',
        'lg-space': '24px',
        'xl-space': '32px'
      }
    }
  },
  plugins: []
}
