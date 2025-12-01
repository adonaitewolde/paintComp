import { createMMKV } from "react-native-mmkv";

// Create MMKV storage instance
// This instance should be reused throughout the app
export const storage = createMMKV({
  id: "moodboard-storage",
});

// Typed storage service with helper methods
export const storageService = {
  // Grid settings
  setGridSpacing: (value: number) => storage.set("gridSpacing", value),
  getGridSpacing: () => storage.getNumber("gridSpacing") ?? 20,

  // Last viewed board
  setLastBoardId: (id: string) => storage.set("lastBoardId", id),
  getLastBoardId: () => storage.getString("lastBoardId"),

  // Viewport transform cache (per board)
  // Stores the current pan position for each board
  setViewportTransform: (boardId: string, x: number, y: number) => {
    storage.set(`viewport.${boardId}`, JSON.stringify({ x, y }));
  },
  getViewportTransform: (boardId: string): { x: number; y: number } | null => {
    const data = storage.getString(`viewport.${boardId}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  // App settings
  setShowGrid: (value: boolean) => storage.set("showGrid", value),
  getShowGrid: () => storage.getBoolean("showGrid") ?? true,

  // Default image size
  setDefaultImageSize: (value: number) =>
    storage.set("defaultImageSize", value),
  getDefaultImageSize: () => storage.getNumber("defaultImageSize") ?? 300,

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
