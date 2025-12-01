import { ImageData } from "../../components/BoardCanvas";
import { getDatabase } from "./database";

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

/**
 * Convert ImageRecord from database to ImageData
 */
const recordToImageData = (record: ImageRecord): ImageData => ({
  id: record.id,
  uri: record.uri,
  x: record.x,
  y: record.y,
  width: record.width,
  height: record.height,
  rotation: record.rotation,
  flipHorizontal: record.flipHorizontal === 1,
  zIndex: record.zIndex ?? 0,
});

/**
 * Convert ImageData to database record format
 */
const imageDataToRecord = (
  image: ImageData,
  boardId: string,
  id?: string
): Omit<ImageRecord, "createdAt"> => {
  const imageId =
    id ||
    image.id ||
    `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: imageId,
    boardId,
    uri: image.uri,
    x: image.x,
    y: image.y,
    width: image.width,
    height: image.height,
    rotation: image.rotation ?? 0,
    flipHorizontal: image.flipHorizontal ? 1 : 0,
    zIndex: image.zIndex ?? 0,
  };
};

export const imageService = {
  /**
   * Get all images for a board, sorted by zIndex (ascending) then createdAt
   */
  async getByBoardId(boardId: string): Promise<ImageData[]> {
    const database = getDatabase();
    const records = await database.getAllAsync<ImageRecord>(
      "SELECT * FROM images WHERE boardId = ? ORDER BY zIndex ASC, createdAt ASC",
      [boardId]
    );
    return records.map(recordToImageData);
  },

  /**
   * Create a new image
   */
  async create(image: ImageData, boardId: string): Promise<string> {
    const database = getDatabase();
    const record = imageDataToRecord(image, boardId);
    const now = Date.now();

    await database.runAsync(
      `INSERT INTO images 
       (id, boardId, uri, x, y, width, height, rotation, flipHorizontal, zIndex, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.boardId,
        record.uri,
        record.x,
        record.y,
        record.width,
        record.height,
        record.rotation,
        record.flipHorizontal,
        record.zIndex,
        now,
      ]
    );

    // Update board's updatedAt timestamp
    await database.runAsync("UPDATE boards SET updatedAt = ? WHERE id = ?", [
      now,
      boardId,
    ]);

    return record.id;
  },

  /**
   * Update image position
   */
  async updatePosition(id: string, x: number, y: number): Promise<void> {
    const database = getDatabase();
    await database.runAsync("UPDATE images SET x = ?, y = ? WHERE id = ?", [
      x,
      y,
      id,
    ]);
  },

  /**
   * Update image transform (position, size, rotation, flip)
   */
  async updateTransform(
    id: string,
    updates: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      flipHorizontal?: boolean;
      zIndex?: number;
    }
  ): Promise<void> {
    const database = getDatabase();

    const setParts: string[] = [];
    const values: (string | number)[] = [];

    if (updates.x !== undefined) {
      setParts.push("x = ?");
      values.push(updates.x);
    }
    if (updates.y !== undefined) {
      setParts.push("y = ?");
      values.push(updates.y);
    }
    if (updates.width !== undefined) {
      setParts.push("width = ?");
      values.push(updates.width);
    }
    if (updates.height !== undefined) {
      setParts.push("height = ?");
      values.push(updates.height);
    }
    if (updates.rotation !== undefined) {
      setParts.push("rotation = ?");
      values.push(updates.rotation);
    }
    if (updates.flipHorizontal !== undefined) {
      setParts.push("flipHorizontal = ?");
      values.push(updates.flipHorizontal ? 1 : 0);
    }
    if (updates.zIndex !== undefined) {
      setParts.push("zIndex = ?");
      values.push(updates.zIndex);
    }

    if (setParts.length === 0) return;

    values.push(id);
    await database.runAsync(
      `UPDATE images SET ${setParts.join(", ")} WHERE id = ?`,
      values
    );
  },

  /**
   * Update image zIndex (bring to front)
   */
  async updateZIndex(id: string, zIndex: number): Promise<void> {
    const database = getDatabase();
    await database.runAsync("UPDATE images SET zIndex = ? WHERE id = ?", [
      zIndex,
      id,
    ]);
  },

  /**
   * Delete an image
   */
  async delete(id: string): Promise<void> {
    const database = getDatabase();
    await database.runAsync("DELETE FROM images WHERE id = ?", [id]);
  },
};
