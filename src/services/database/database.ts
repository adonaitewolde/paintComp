import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("moodboard.db");

    // Create tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        boardId TEXT NOT NULL,
        uri TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        rotation REAL DEFAULT 0,
        flipHorizontal INTEGER DEFAULT 0,
        zIndex INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_images_boardId ON images(boardId);
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};
