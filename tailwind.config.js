/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // ===== TraceScope Oklch Color System =====
        // Usage: bg-ts-primary, text-ts-foreground, etc.
        
        tracescope: {
          // General
          background: 'oklch(var(--ts-background) / <alpha-value>)',
          foreground: 'oklch(var(--ts-foreground) / <alpha-value>)',
          primary: 'oklch(var(--ts-primary) / <alpha-value>)',
          'primary-foreground': 'oklch(var(--ts-primary-foreground) / <alpha-value>)',
          muted: 'oklch(var(--ts-muted) / <alpha-value>)',
          'muted-foreground': 'oklch(var(--ts-muted-foreground) / <alpha-value>)',
          border: 'oklch(var(--ts-border) / <alpha-value>)',
          'border-subtle': 'oklch(var(--ts-border-subtle) / <alpha-value>)',
          
          // Status
          success: 'oklch(var(--ts-success) / <alpha-value>)',
          'success-muted': 'oklch(var(--ts-success-muted) / <alpha-value>)',
          'success-muted-foreground': 'oklch(var(--ts-success-muted-foreground) / <alpha-value>)',
          error: 'oklch(var(--ts-error) / <alpha-value>)',
          'error-muted': 'oklch(var(--ts-error-muted) / <alpha-value>)',
          'error-muted-foreground': 'oklch(var(--ts-error-muted-foreground) / <alpha-value>)',
          warning: 'oklch(var(--ts-warning) / <alpha-value>)',
          'warning-muted': 'oklch(var(--ts-warning-muted) / <alpha-value>)',
          'warning-muted-foreground': 'oklch(var(--ts-warning-muted-foreground) / <alpha-value>)',
          streaming: 'oklch(var(--ts-streaming) / <alpha-value>)',
          'streaming-muted': 'oklch(var(--ts-streaming-muted) / <alpha-value>)',
          'streaming-muted-foreground': 'oklch(var(--ts-streaming-muted-foreground) / <alpha-value>)',
          
          // Node types
          'node-user': 'oklch(var(--ts-node-user) / <alpha-value>)',
          'node-thought': 'oklch(var(--ts-node-thought) / <alpha-value>)',
          'node-tool': 'oklch(var(--ts-node-tool) / <alpha-value>)',
          'node-code': 'oklch(var(--ts-node-code) / <alpha-value>)',
          'node-result': 'oklch(var(--ts-node-result) / <alpha-value>)',
          'node-output': 'oklch(var(--ts-node-output) / <alpha-value>)',
          'node-error': 'oklch(var(--ts-node-error) / <alpha-value>)',
          
          // Badges
          'badge-user': 'oklch(var(--ts-badge-user) / <alpha-value>)',
          'badge-user-foreground': 'oklch(var(--ts-badge-user-foreground) / <alpha-value>)',
          'badge-thought': 'oklch(var(--ts-badge-thought) / <alpha-value>)',
          'badge-thought-foreground': 'oklch(var(--ts-badge-thought-foreground) / <alpha-value>)',
          'badge-tool': 'oklch(var(--ts-badge-tool) / <alpha-value>)',
          'badge-tool-foreground': 'oklch(var(--ts-badge-tool-foreground) / <alpha-value>)',
          'badge-code': 'oklch(var(--ts-badge-code) / <alpha-value>)',
          'badge-code-foreground': 'oklch(var(--ts-badge-code-foreground) / <alpha-value>)',
          'badge-result': 'oklch(var(--ts-badge-result) / <alpha-value>)',
          'badge-result-foreground': 'oklch(var(--ts-badge-result-foreground) / <alpha-value>)',
          'badge-output': 'oklch(var(--ts-badge-output) / <alpha-value>)',
          'badge-output-foreground': 'oklch(var(--ts-badge-output-foreground) / <alpha-value>)',
          'badge-error': 'oklch(var(--ts-badge-error) / <alpha-value>)',
          'badge-error-foreground': 'oklch(var(--ts-badge-error-foreground) / <alpha-value>)',
          
          // Timeline
          'timeline-user': 'oklch(var(--ts-timeline-user) / <alpha-value>)',
          'timeline-thought': 'oklch(var(--ts-timeline-thought) / <alpha-value>)',
          'timeline-tool': 'oklch(var(--ts-timeline-tool) / <alpha-value>)',
          'timeline-code': 'oklch(var(--ts-timeline-code) / <alpha-value>)',
          'timeline-result': 'oklch(var(--ts-timeline-result) / <alpha-value>)',
          'timeline-output': 'oklch(var(--ts-timeline-output) / <alpha-value>)',
          'timeline-error': 'oklch(var(--ts-timeline-error) / <alpha-value>)',
        },
        
        // Shorthand aliases (without tracescope prefix)
        'ts-background': 'oklch(var(--ts-background) / <alpha-value>)',
        'ts-foreground': 'oklch(var(--ts-foreground) / <alpha-value>)',
        'ts-primary': 'oklch(var(--ts-primary) / <alpha-value>)',
        'ts-muted': 'oklch(var(--ts-muted) / <alpha-value>)',
        'ts-muted-foreground': 'oklch(var(--ts-muted-foreground) / <alpha-value>)',
        'ts-border': 'oklch(var(--ts-border) / <alpha-value>)',
        'ts-border-subtle': 'oklch(var(--ts-border-subtle) / <alpha-value>)',
        'ts-success': 'oklch(var(--ts-success) / <alpha-value>)',
        'ts-success-muted': 'oklch(var(--ts-success-muted) / <alpha-value>)',
        'ts-success-muted-foreground': 'oklch(var(--ts-success-muted-foreground) / <alpha-value>)',
        'ts-error': 'oklch(var(--ts-error) / <alpha-value>)',
        'ts-error-muted': 'oklch(var(--ts-error-muted) / <alpha-value>)',
        'ts-error-muted-foreground': 'oklch(var(--ts-error-muted-foreground) / <alpha-value>)',
        'ts-warning': 'oklch(var(--ts-warning) / <alpha-value>)',
        'ts-warning-muted': 'oklch(var(--ts-warning-muted) / <alpha-value>)',
        'ts-warning-muted-foreground': 'oklch(var(--ts-warning-muted-foreground) / <alpha-value>)',
        'ts-streaming': 'oklch(var(--ts-streaming) / <alpha-value>)',
        'ts-streaming-muted': 'oklch(var(--ts-streaming-muted) / <alpha-value>)',
        'ts-streaming-muted-foreground': 'oklch(var(--ts-streaming-muted-foreground) / <alpha-value>)',
        
        // Node type colors (shorthand)
        'ts-node-user': 'oklch(var(--ts-node-user) / <alpha-value>)',
        'ts-node-thought': 'oklch(var(--ts-node-thought) / <alpha-value>)',
        'ts-node-tool': 'oklch(var(--ts-node-tool) / <alpha-value>)',
        'ts-node-code': 'oklch(var(--ts-node-code) / <alpha-value>)',
        'ts-node-result': 'oklch(var(--ts-node-result) / <alpha-value>)',
        'ts-node-output': 'oklch(var(--ts-node-output) / <alpha-value>)',
        'ts-node-error': 'oklch(var(--ts-node-error) / <alpha-value>)',
        
        // Badge colors (shorthand)
        'ts-badge-user': 'oklch(var(--ts-badge-user) / <alpha-value>)',
        'ts-badge-user-foreground': 'oklch(var(--ts-badge-user-foreground) / <alpha-value>)',
        'ts-badge-thought': 'oklch(var(--ts-badge-thought) / <alpha-value>)',
        'ts-badge-thought-foreground': 'oklch(var(--ts-badge-thought-foreground) / <alpha-value>)',
        'ts-badge-tool': 'oklch(var(--ts-badge-tool) / <alpha-value>)',
        'ts-badge-tool-foreground': 'oklch(var(--ts-badge-tool-foreground) / <alpha-value>)',
        'ts-badge-code': 'oklch(var(--ts-badge-code) / <alpha-value>)',
        'ts-badge-code-foreground': 'oklch(var(--ts-badge-code-foreground) / <alpha-value>)',
        'ts-badge-result': 'oklch(var(--ts-badge-result) / <alpha-value>)',
        'ts-badge-result-foreground': 'oklch(var(--ts-badge-result-foreground) / <alpha-value>)',
        'ts-badge-output': 'oklch(var(--ts-badge-output) / <alpha-value>)',
        'ts-badge-output-foreground': 'oklch(var(--ts-badge-output-foreground) / <alpha-value>)',
        'ts-badge-error': 'oklch(var(--ts-badge-error) / <alpha-value>)',
        'ts-badge-error-foreground': 'oklch(var(--ts-badge-error-foreground) / <alpha-value>)',
        
        // Timeline colors (shorthand)
        'ts-timeline-user': 'oklch(var(--ts-timeline-user) / <alpha-value>)',
        'ts-timeline-thought': 'oklch(var(--ts-timeline-thought) / <alpha-value>)',
        'ts-timeline-tool': 'oklch(var(--ts-timeline-tool) / <alpha-value>)',
        'ts-timeline-code': 'oklch(var(--ts-timeline-code) / <alpha-value>)',
        'ts-timeline-result': 'oklch(var(--ts-timeline-result) / <alpha-value>)',
        'ts-timeline-output': 'oklch(var(--ts-timeline-output) / <alpha-value>)',
        'ts-timeline-error': 'oklch(var(--ts-timeline-error) / <alpha-value>)',
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
      },
      transitionDuration: {
        'fast': '150ms',
      },
      animation: {
        'pulse-slow': 'pulse 1.5s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
}
