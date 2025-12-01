/**
 * Constants - Zentrale Definition aller App-Konstanten
 *
 * Diese Datei enthält alle wiederkehrenden Konstanten-Werte,
 * die in der App verwendet werden.
 */

// ===== GRID KONSTANTEN =====
export const GRID_SPACING = 20;
export const WORLD_SIZE_MULTIPLIER = 8;

// ===== BILD KONSTANTEN =====
export const MAX_IMAGE_DIMENSION = 2048; // Maximale Bilddimension für Optimierung
export const DEFAULT_IMAGE_SIZE = 300; // Standard-Bildgröße beim Import
export const IMAGE_COMPRESSION_QUALITY = 0.7; // Komprimierungsqualität für Bilder
export const HEIC_COMPRESSION_QUALITY = 0.8; // Komprimierungsqualität für HEIC-Konvertierung

// ===== BILD-LAYER KONSTANTEN =====
export const SELECTED_BORDER_WIDTH = 3; // Breite des Auswahl-Rahmens

// ===== GESTEN KONSTANTEN =====
export const TAP_MAX_DURATION = 200; // Maximale Dauer für Tap-Geste (ms)
export const TAP_MAX_DISTANCE = 15; // Maximale Distanz für Tap-Geste (px) - erhöht für bessere Zuverlässigkeit
export const PAN_MIN_DISTANCE = 10; // Minimale Distanz für Pan-Aktivierung (px)

// ===== DATENBANK STANDARDWERTE =====
export const DEFAULT_ROTATION = 0; // Standard-Rotation in Grad
export const DEFAULT_FLIP_HORIZONTAL = 0; // Standard-Flip (0 = false, 1 = true)
export const DEFAULT_Z_INDEX = 0; // Standard Z-Index für Layer-Reihenfolge

// ===== STORAGE KONSTANTEN =====
export const STORAGE_ID = "moodboard-storage"; // MMKV Storage ID

// ===== STORAGE KEYS =====
export const STORAGE_KEYS = {
  GRID_SPACING: "gridSpacing",
  LAST_BOARD_ID: "lastBoardId",
  SHOW_GRID: "showGrid",
  DEFAULT_IMAGE_SIZE: "defaultImageSize",
  VIEWPORT_TRANSFORM: (boardId: string) => `viewport.${boardId}`,
} as const;
