import { getDatabase } from './database';

export type Board = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export const boardService = {
  /**
   * Get all boards, ordered by most recently updated
   */
  async getAll(): Promise<Board[]> {
    const database = getDatabase();
    return await database.getAllAsync<Board>(
      'SELECT * FROM boards ORDER BY updatedAt DESC'
    );
  },

  /**
   * Get a board by ID
   */
  async getById(id: string): Promise<Board | null> {
    const database = getDatabase();
    const result = await database.getFirstAsync<Board>(
      'SELECT * FROM boards WHERE id = ?',
      [id]
    );
    return result ?? null;
  },

  /**
   * Create a new board
   */
  async create(name: string): Promise<string> {
    const database = getDatabase();
    const id = `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    await database.runAsync(
      'INSERT INTO boards (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [id, name, now, now]
    );
    
    return id;
  },

  /**
   * Update board name
   */
  async update(id: string, name: string): Promise<void> {
    const database = getDatabase();
    await database.runAsync(
      'UPDATE boards SET name = ?, updatedAt = ? WHERE id = ?',
      [name, Date.now(), id]
    );
  },

  /**
   * Delete a board and all its images (CASCADE)
   */
  async delete(id: string): Promise<void> {
    const database = getDatabase();
    await database.runAsync('DELETE FROM boards WHERE id = ?', [id]);
  },
};

