// Database types
export type Board = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type ImageRecord = {
  id: string;
  boardId: string;
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipHorizontal: number; // SQLite stores boolean as 0/1
  zIndex: number;
  createdAt: number;
};

// Component types
export type ImageData = {
  id?: string; // Database ID (optional for backward compatibility)
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // Rotation in degrees (0, 90, 180, 270)
  flipHorizontal?: boolean; // Flip horizontally
  zIndex?: number; // Z-index for layer ordering (higher = on top)
};

// Service types
export type PickImagesResult = {
  uris: string[];
};
