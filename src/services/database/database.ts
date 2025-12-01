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
      
      -- Migration: Add zIndex column if it doesn't exist (for existing databases)
      -- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
      -- We'll handle this gracefully by trying to add it and ignoring if it exists
    `);

    // Try to add zIndex column if it doesn't exist (migration for existing databases)
    try {
      await db.execAsync(`
        ALTER TABLE images ADD COLUMN zIndex INTEGER DEFAULT 0;
      `);
    } catch (error: any) {
      // Column already exists, ignore error
      if (!error.message?.includes("duplicate column")) {
        console.warn("Could not add zIndex column (may already exist):", error);
      }
    }

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
