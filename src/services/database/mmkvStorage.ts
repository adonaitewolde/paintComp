import { createMMKV } from "react-native-mmkv";
import {
  DEFAULT_IMAGE_SIZE,
  GRID_SPACING,
  STORAGE_ID,
  STORAGE_KEYS,
} from "../../utils/constants";

// Create MMKV storage instance
// This instance should be reused throughout the app
export const storage = createMMKV({
  id: STORAGE_ID,
});

// Typed storage service with helper methods
export const storageService = {
  // Grid settings
  setGridSpacing: (value: number) =>
    storage.set(STORAGE_KEYS.GRID_SPACING, value),
  getGridSpacing: () =>
    storage.getNumber(STORAGE_KEYS.GRID_SPACING) ?? GRID_SPACING,

  // Last viewed board
  setLastBoardId: (id: string) => storage.set(STORAGE_KEYS.LAST_BOARD_ID, id),
  getLastBoardId: () => storage.getString(STORAGE_KEYS.LAST_BOARD_ID),

  // Viewport transform cache (per board)
  // Stores the current pan position for each board
  setViewportTransform: (boardId: string, x: number, y: number) => {
    storage.set(
      STORAGE_KEYS.VIEWPORT_TRANSFORM(boardId),
      JSON.stringify({ x, y })
    );
  },
  getViewportTransform: (boardId: string): { x: number; y: number } | null => {
    const data = storage.getString(STORAGE_KEYS.VIEWPORT_TRANSFORM(boardId));
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  // App settings
  setShowGrid: (value: boolean) => storage.set(STORAGE_KEYS.SHOW_GRID, value),
  getShowGrid: () => storage.getBoolean(STORAGE_KEYS.SHOW_GRID) ?? true,

  // Default image size
  setDefaultImageSize: (value: number) =>
    storage.set(STORAGE_KEYS.DEFAULT_IMAGE_SIZE, value),
  getDefaultImageSize: () =>
    storage.getNumber(STORAGE_KEYS.DEFAULT_IMAGE_SIZE) ?? DEFAULT_IMAGE_SIZE,

  // Clear all data (for testing/debugging)
  clearAll: () => storage.clearAll(),

  // Check if key exists
  contains: (key: string) => storage.contains(key),

  // Get all keys
  getAllKeys: () => storage.getAllKeys(),

  // Remove specific key (set to undefined to remove)
  remove: (key: string) => {
    // In MMKV, setting a value to undefined removes it
    // @ts-ignore - MMKV accepts undefined to remove keys
    storage.set(key, undefined);
  },
};
