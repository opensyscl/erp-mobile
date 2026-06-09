/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './node_modules/heroui-native/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          subtle: 'rgb(var(--bg-subtle) / <alpha-value>)',
          muted: 'rgb(var(--bg-muted) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--fg-subtle) / <alpha-value>)',
          inverse: 'rgb(var(--fg-inverse) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          fg: 'rgb(var(--brand-fg) / <alpha-value>)',
          subtle: 'rgb(var(--brand-subtle) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          fg: 'rgb(var(--secondary-fg) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        purple: 'rgb(var(--purple) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        display: ['Inter_700Bold'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.2px' }],
        xs: ['12px', { lineHeight: '16px', letterSpacing: '0.1px' }],
        sm: ['14px', { lineHeight: '20px', letterSpacing: '0px' }],
        base: ['16px', { lineHeight: '24px', letterSpacing: '-0.1px' }],
        lg: ['18px', { lineHeight: '26px', letterSpacing: '-0.2px' }],
        xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.3px' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.5px' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.7px' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.9px' }],
        '5xl': ['48px', { lineHeight: '52px', letterSpacing: '-1.1px' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '17': '68px',
        '18': '72px',
      },
    },
  },
  plugins: [],
};
