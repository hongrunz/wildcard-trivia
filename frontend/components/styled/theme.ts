/**
 * Theme Variables
 * 
 * This file contains all color and typography constants used throughout the application.
 * Update these values to change the color scheme and typography globally.
 */

export const colors = {
  // Primary Colors
  primary: '#43A8FB',
  border: '#469BE2',
  bgContrast: '#0E6AB6',
  primarySelected: '#123858',
  
  // Accent Colors
  accent: '#F6D705',
  typeAccent: '#EDBA00',
  
  // Surface Colors
  surface: '#FFFFFF',
  surfaceSecondary: 'rgba(72, 128, 175, 0.05)', // #4880AF with 5% opacity
  surfaceDark: '#DAE6EF',

  
  // Text Colors
  typeMain: '#253441',
  typeSecondary: '#89929A',
  
  // Legacy/Additional Colors (for backward compatibility)
  // These can be mapped to the new color scheme
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  blue: {
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  green: {
    500: '#10b981',
    600: '#16a34a',
    700: '#15803d',
  },
  red: {
    500: '#ef4444',
    600: '#dc2626',
  },
  yellow: {
    100: '#fef3c7',
  },
  amber: {
    500: '#f59e0b',
  },
} as const;

/**
 * Typography Theme Variables
 * 
 * Font families are defined as CSS variables in app/layout.tsx and app/globals.css
 * Use these in styled components: font-family: ${typography.fontFamily.dmSans};
 */
export const typography = {
  // Font Families
  fontFamily: {
    // Primary font - DM Sans (for body text, UI elements)
    dmSans: 'var(--font-dm-sans), sans-serif',
    
    // Display font - Itim (for headings, titles, playful text)
    itim: 'var(--font-itim), cursive',
    
    // Legacy fonts (for backward compatibility)
    geistSans: 'var(--font-geist-sans), sans-serif',
    geistMono: 'var(--font-geist-mono), monospace',
    shadowsIntoLight: 'var(--font-shadows-into-light), cursive',
  },

  // Font Sizes (in rem units)
  fontSize: {
    // Display sizes (big screen, hero text)
    display3xl: '3rem',      // 48px - Big screen question text, Error icon
    display2xl: '2rem',      // 32px - Big screen badge, option box, leaderboard heading (desktop)
    displayxl: '1.875rem',   // 30px - Page titles, Game titles, Error title
    displaylg: '1.75rem',    // 28px - Music button icon
    displaymd: '1.5rem',     // 24px - Big screen question (tablet), option box (tablet), explanation, leaderboard item (desktop)
    displaysm: '1.25rem',    // 20px - Error heading
    
    // Body sizes
    xl: '1.2rem',            // 19.2px - Centered message
    lg: '1.125rem',          // 18px - Player avatar, Ellipsis
    base: '1rem',            // 16px - Base text, Inputs, Buttons, Game text, Badges, Leaderboard items
    sm: '0.95rem',           // 15.2px - Option buttons, Error message
    xs: '0.875rem',          // 14px - Small text, Links, Helper text, Topic badges, Info boxes, Tooltips
  },

  // Font Weights
  fontWeight: {
    normal: 400,             // Default body text
    medium: 500,             // Base buttons
    semibold: 600,           // Large buttons, Feedback messages, Leaderboard headings, Question text (big screen), Option buttons
    bold: 700,               // Titles, Headings, Badges, Player avatars
    // Note: 'bold' keyword (700) is also used in some components
  },

  // Typography Presets (commonly used combinations)
  presets: {
    // Headings
    h1: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1.875rem',  // 30px
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1.25rem',   // 20px
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1rem',      // 16px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    // AI commentary

    Commentary: {
      fontFamily: 'var(--font-itim), cursive',
      fontSize: '1.5rem',      // 16px
      fontWeight: 400,
      lineHeight: 1.5,
    },

    // Body text
    body: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1rem',      // 16px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '0.875rem',  // 14px
      fontWeight: 400,
      lineHeight: 1.5,
    },

    // Buttons
    button: {
      fontFamily: 'var(--font-itim), cursive',
      fontSize: '1.2rem',      // 16px
      fontWeight: 500,
      lineHeight: 1.5,
    },
    buttonLarge: {
      fontFamily: 'var(--font-itim), sans-serif',
      fontSize: '1.4rem',      // 16px
      fontWeight: 600,
      lineHeight: 1.5,
    },

    // Inputs
    input: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1rem',      // 16px
      fontWeight: 400,
      lineHeight: 1.5,
    },

    // Labels
    label: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1rem',      // 16px (inherits from parent, but can be explicitly set)
      fontWeight: 400,
      lineHeight: 1.5,
    },

    // Links
    link: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '0.875rem',  // 14px
      fontWeight: 400,
      lineHeight: 1.5,
    },

    // Badges
    badge: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1rem',  // 14px
      fontWeight: 400,
      lineHeight: 1.2,
    },
    badgeLarge: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1.2rem',      // 16px
      fontWeight: 700,
      lineHeight: 1.2,
    },

    // Big Screen Display
    bigScreenQuestion: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '2rem',      // 48px (desktop), responsive in component
      fontWeight: 600,
      lineHeight: 1.3,
    },
    bigScreenOption: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '1.2rem',      // 32px (desktop), responsive in component
      fontWeight: 600,
      lineHeight: 1.4,
    },
    bigScreenBadge: {
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: '2rem',      // 32px (desktop), responsive in component
      fontWeight: 700,
      lineHeight: 1.2,
    },
  },

  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.2,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
    loose: 2,
  },
} as const;

// Type exports for TypeScript
export type ColorTheme = typeof colors;
export type TypographyTheme = typeof typography;
export type TypographyPreset = keyof typeof typography.presets;
