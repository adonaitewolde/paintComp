/**
 * Design Tokens - Zentrale Definition aller Design-Werte
 *
 * Diese Datei enthält alle wiederkehrenden Werte (Farben, Spacing, etc.)
 * die in der App verwendet werden. Änderungen hier wirken sich auf die
 * gesamte App aus.
 */

// ===== FARBEN =====
export const colors = {
  // Backgrounds
  background: {
    primary: "#14181c", // BoardCanvas background
    secondary: "#292929", // ImportButton, surfaces
    root: "#050608", // RootLayout background
  },

  // Accent/Interactive
  accent: {
    primary: "#007AFF", // iOS blue - selected states, buttons
  },

  // Text
  text: {
    primary: "#FFFFFF",
    white: "white", // Für direkte Verwendung
  },

  // Borders
  border: {
    selected: "#007AFF",
    grid: "rgb(41, 41, 41)", // Grid color
  },

  // Shadows
  shadow: "#000",
} as const;

// ===== SPACING =====
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// ===== BORDER RADIUS =====
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 18,
} as const;
