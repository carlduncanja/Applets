import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');
  
  // Initialize tables
  initializeTables(db);

  return db;
}

function initializeTables(db: Database.Database) {
  // Create entities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      data TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
    CREATE INDEX IF NOT EXISTS idx_entities_deleted ON entities(entity_type, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_entities_created ON entities(created_at DESC);
  `);

  // Create entity_relations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_relations (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      properties TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES entities(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for relations
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_relations_source ON entity_relations(source_id, relation_type);
    CREATE INDEX IF NOT EXISTS idx_relations_target ON entity_relations(target_id, relation_type);
    CREATE INDEX IF NOT EXISTS idx_relations_type ON entity_relations(relation_type);
  `);

  // Create dynamic indexes table to track auto-created indexes
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_indexes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      field_name TEXT NOT NULL,
      index_name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
