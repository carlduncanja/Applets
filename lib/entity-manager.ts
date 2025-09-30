import { getDatabase } from './database';
import { createHash, randomUUID } from 'crypto';
import type Database from 'better-sqlite3';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface EntitySchema {
  type: string;
  fields: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
      required?: boolean;
      indexed?: boolean;
      unique?: boolean;
      validate?: (value: any) => boolean;
      transform?: (value: any) => any;
    };
  };
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  cache?: boolean;
  cacheTTL?: number;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface QueryOperators {
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  $ne?: any;
  $in?: any[];
  $like?: string;
}

// ============================================
// ENTITY MANAGER
// ============================================

export class EntityManager {
  private db: Database.Database;
  private cache: Map<string, CacheEntry>;
  private schemas: Map<string, EntitySchema>;
  private queryStats: Map<string, number>;
  private indexQueue: Set<string>;

  constructor() {
    this.db = getDatabase();
    this.cache = new Map();
    this.schemas = new Map();
    this.queryStats = new Map();
    this.indexQueue = new Set();
  }

  // ============================================
  // SCHEMA MANAGEMENT
  // ============================================

  registerSchema(schema: EntitySchema): void {
    this.schemas.set(schema.type, schema);
    this.createSchemaIndexes(schema);
  }

  private createSchemaIndexes(schema: EntitySchema): void {
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      if (fieldDef.indexed || fieldDef.unique) {
        this.createJsonIndex(schema.type, fieldName, fieldDef.unique);
      }
    }
  }

  private createJsonIndex(entityType: string, fieldName: string, unique: boolean = false): void {
    const indexName = `idx_${entityType}_${fieldName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    
    try {
      // Check if index already exists
      const existing = this.db.prepare(`
        SELECT index_name FROM entity_indexes WHERE index_name = ?
      `).get(indexName);

      if (existing) return;

      // Create virtual column and index
      const uniqueStr = unique ? 'UNIQUE' : '';
      this.db.exec(`
        CREATE ${uniqueStr} INDEX IF NOT EXISTS ${indexName}
        ON entities(json_extract(data, '$.${fieldName}'))
        WHERE entity_type = '${entityType}' AND deleted_at IS NULL
      `);

      // Track the index
      this.db.prepare(`
        INSERT OR IGNORE INTO entity_indexes (entity_type, field_name, index_name)
        VALUES (?, ?, ?)
      `).run(entityType, fieldName, indexName);

    } catch (err) {
      console.error(`Failed to create index ${indexName}:`, err);
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateEntity(entityType: string, data: any): { valid: boolean; errors: string[] } {
    const schema = this.schemas.get(entityType);
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      const value = data[fieldName];

      // Check required fields
      if (fieldDef.required && (value === undefined || value === null)) {
        errors.push(`Field '${fieldName}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type checking
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (fieldDef.type === 'date') {
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors.push(`Field '${fieldName}' must be a valid date`);
          }
        } else if (actualType !== fieldDef.type) {
          errors.push(`Field '${fieldName}' must be of type ${fieldDef.type}, got ${actualType}`);
        }

        // Custom validation
        if (fieldDef.validate && !fieldDef.validate(value)) {
          errors.push(`Field '${fieldName}' failed validation`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private transformEntity(entityType: string, data: any): any {
    const schema = this.schemas.get(entityType);
    if (!schema) return data;

    const transformed = { ...data };

    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      if (fieldDef.transform && transformed[fieldName] !== undefined) {
        transformed[fieldName] = fieldDef.transform(transformed[fieldName]);
      }
    }

    return transformed;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  private getCacheKey(operation: string, ...args: any[]): string {
    const hash = createHash('md5');
    hash.update(operation + JSON.stringify(args));
    return hash.digest('hex');
  }

  private getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: any, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================
  // CREATE
  // ============================================

  create(entityType: string, data: any, metadata: any = {}): any {
    // Validate
    const validation = this.validateEntity(entityType, data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform
    const transformed = this.transformEntity(entityType, data);

    // Check uniqueness
    this.checkUniqueness(entityType, transformed);

    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO entities (id, entity_type, data, metadata)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entityType,
      JSON.stringify(transformed),
      JSON.stringify(metadata)
    );

    // Invalidate cache
    this.invalidateCache(entityType);

    return this.findById(id, { cache: false });
  }

  createMany(entityType: string, records: any[]): any[] {
    const insertStmt = this.db.prepare(`
      INSERT INTO entities (id, entity_type, data, metadata)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((records: any[]) => {
      const results: string[] = [];

      for (const data of records) {
        const validation = this.validateEntity(entityType, data);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const transformed = this.transformEntity(entityType, data);
        const id = randomUUID();

        insertStmt.run(
          id,
          entityType,
          JSON.stringify(transformed),
          JSON.stringify({})
        );

        results.push(id);
      }

      return results;
    });

    const ids = transaction(records);
    this.invalidateCache(entityType);

    return ids.map(id => this.findById(id, { cache: false }));
  }

  private checkUniqueness(entityType: string, data: any): void {
    const schema = this.schemas.get(entityType);
    if (!schema) return;

    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      if (fieldDef.unique && data[fieldName] !== undefined) {
        const existing = this.findOne(entityType, { [fieldName]: data[fieldName] });
        if (existing) {
          throw new Error(`Duplicate value for unique field '${fieldName}'`);
        }
      }
    }
  }

  // ============================================
  // READ
  // ============================================

  findById(id: string, options: QueryOptions = {}): any | null {
    const cacheKey = this.getCacheKey('findById', id);
    
    if (options.cache !== false) {
      const cached = this.getCache(cacheKey);
      if (cached) return cached;
    }

    const stmt = this.db.prepare(`
      SELECT * FROM entities 
      WHERE id = ? AND deleted_at IS NULL
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    const entity = {
      ...row,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata)
    };

    if (options.cache !== false) {
      this.setCache(cacheKey, entity, options.cacheTTL || 60000);
    }

    return entity;
  }

  findOne(entityType: string, filters: any, options: QueryOptions = {}): any | null {
    const results = this.find(entityType, filters, { ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  find(entityType: string, filters: any = {}, options: QueryOptions = {}): any[] {
    const cacheKey = this.getCacheKey('find', entityType, filters, options);
    
    if (options.cache !== false) {
      const cached = this.getCache(cacheKey);
      if (cached) return cached;
    }

    // Track query patterns
    for (const field of Object.keys(filters)) {
      this.trackQuery(entityType, field);
    }

    const { query, params } = this.buildQuery(entityType, filters, options);
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    const entities = rows.map(row => ({
      ...row,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata)
    }));

    if (options.cache !== false) {
      this.setCache(cacheKey, entities, options.cacheTTL || 60000);
    }

    return entities;
  }

  count(entityType: string, filters: any = {}): number {
    const { conditions, params } = this.buildConditions(entityType, filters);
    
    const query = `
      SELECT COUNT(*) as count FROM entities 
      WHERE ${conditions.join(' AND ')}
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as any;
    return result.count;
  }

  exists(entityType: string, filters: any): boolean {
    return this.count(entityType, filters) > 0;
  }

  private buildQuery(entityType: string, filters: any, options: QueryOptions): { query: string; params: any[] } {
    const { conditions, params } = this.buildConditions(entityType, filters);
    const orderBy = options.orderBy || 'created_at';
    const orderDirection = options.orderDirection || 'DESC';
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM entities 
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    return { query, params: [...params, limit, offset] };
  }

  private buildConditions(entityType: string, filters: any): { conditions: string[]; params: any[] } {
    const conditions = ["entity_type = ?", "deleted_at IS NULL"];
    const params: any[] = [entityType];

    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        conditions.push(`json_extract(data, '$.${key}') IS NULL`);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle operators
        for (const [op, opValue] of Object.entries(value as QueryOperators)) {
          switch (op) {
            case '$gt':
              conditions.push(`CAST(json_extract(data, '$.${key}') AS REAL) > ?`);
              params.push(opValue);
              break;
            case '$gte':
              conditions.push(`CAST(json_extract(data, '$.${key}') AS REAL) >= ?`);
              params.push(opValue);
              break;
            case '$lt':
              conditions.push(`CAST(json_extract(data, '$.${key}') AS REAL) < ?`);
              params.push(opValue);
              break;
            case '$lte':
              conditions.push(`CAST(json_extract(data, '$.${key}') AS REAL) <= ?`);
              params.push(opValue);
              break;
            case '$ne':
              conditions.push(`json_extract(data, '$.${key}') != ?`);
              params.push(opValue);
              break;
            case '$in':
              const placeholders = (opValue as any[]).map(() => '?').join(',');
              conditions.push(`json_extract(data, '$.${key}') IN (${placeholders})`);
              params.push(...(opValue as any[]));
              break;
            case '$like':
              conditions.push(`json_extract(data, '$.${key}') LIKE ?`);
              params.push(opValue);
              break;
          }
        }
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(',');
        conditions.push(`json_extract(data, '$.${key}') IN (${placeholders})`);
        params.push(...value);
      } else {
        conditions.push(`json_extract(data, '$.${key}') = ?`);
        params.push(String(value));
      }
    }

    return { conditions, params };
  }

  // ============================================
  // UPDATE
  // ============================================

  update(id: string, updates: any): any | null {
    const existing = this.findById(id, { cache: false });
    if (!existing) return null;

    // Validate updates
    const merged = { ...existing.data, ...updates };
    const validation = this.validateEntity(existing.entity_type, merged);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform
    const transformed = this.transformEntity(existing.entity_type, updates);
    const newData = { ...existing.data, ...transformed };

    const stmt = this.db.prepare(`
      UPDATE entities 
      SET data = ?,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
      WHERE id = ? AND deleted_at IS NULL
    `);

    stmt.run(JSON.stringify(newData), id);

    // Invalidate cache
    this.invalidateCache(existing.entity_type);

    return this.findById(id, { cache: false });
  }

  updateMany(entityType: string, filters: any, updates: any): number {
    const entities = this.find(entityType, filters, { cache: false });
    
    const updateStmt = this.db.prepare(`
      UPDATE entities 
      SET data = ?,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
      WHERE id = ?
    `);

    const transaction = this.db.transaction((entities: any[]) => {
      let count = 0;
      for (const entity of entities) {
        const newData = { ...entity.data, ...updates };
        updateStmt.run(JSON.stringify(newData), entity.id);
        count++;
      }
      return count;
    });

    const count = transaction(entities);
    this.invalidateCache(entityType);

    return count;
  }

  replace(id: string, data: any): any | null {
    const existing = this.findById(id, { cache: false });
    if (!existing) return null;

    // Validate
    const validation = this.validateEntity(existing.entity_type, data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform
    const transformed = this.transformEntity(existing.entity_type, data);

    const stmt = this.db.prepare(`
      UPDATE entities 
      SET data = ?,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
      WHERE id = ? AND deleted_at IS NULL
    `);

    stmt.run(JSON.stringify(transformed), id);

    this.invalidateCache(existing.entity_type);

    return this.findById(id, { cache: false });
  }

  // ============================================
  // DELETE
  // ============================================

  delete(id: string, soft: boolean = true): boolean {
    const existing = this.findById(id, { cache: false });
    if (!existing) return false;

    if (soft) {
      const stmt = this.db.prepare(`
        UPDATE entities 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(id);
    } else {
      const stmt = this.db.prepare(`
        DELETE FROM entities WHERE id = ?
      `);
      stmt.run(id);
    }

    this.invalidateCache(existing.entity_type);
    return true;
  }

  deleteMany(entityType: string, filters: any, soft: boolean = true): number {
    const entities = this.find(entityType, filters, { cache: false });

    if (soft) {
      const stmt = this.db.prepare(`
        UPDATE entities 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const transaction = this.db.transaction((entities: any[]) => {
        for (const entity of entities) {
          stmt.run(entity.id);
        }
        return entities.length;
      });

      const count = transaction(entities);
      this.invalidateCache(entityType);
      return count;
    } else {
      const stmt = this.db.prepare(`
        DELETE FROM entities WHERE id = ?
      `);

      const transaction = this.db.transaction((entities: any[]) => {
        for (const entity of entities) {
          stmt.run(entity.id);
        }
        return entities.length;
      });

      const count = transaction(entities);
      this.invalidateCache(entityType);
      return count;
    }
  }

  restore(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE entities 
      SET deleted_at = NULL
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ============================================
  // ADVANCED QUERIES
  // ============================================

  search(entityType: string, searchTerm: string, options: QueryOptions = {}): any[] {
    const limit = options.limit || 50;
    
    const query = `
      SELECT * FROM entities 
      WHERE entity_type = ?
        AND data LIKE ?
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(entityType, `%${searchTerm}%`, limit) as any[];

    return rows.map(row => ({
      ...row,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata)
    }));
  }

  aggregate(entityType: string, field: string, operation: 'sum' | 'avg' | 'min' | 'max' | 'count'): number {
    const query = `
      SELECT ${operation.toUpperCase()}(CAST(json_extract(data, '$.${field}') AS REAL)) as result
      FROM entities
      WHERE entity_type = ? AND deleted_at IS NULL
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(entityType) as any;
    return result.result || 0;
  }

  // ============================================
  // QUERY OPTIMIZATION
  // ============================================

  private trackQuery(entityType: string, field: string): void {
    const key = `${entityType}.${field}`;
    this.queryStats.set(key, (this.queryStats.get(key) || 0) + 1);

    // If a field is queried frequently (>100 times), auto-create index
    if (this.queryStats.get(key)! > 100 && !this.indexQueue.has(key)) {
      this.indexQueue.add(key);
      this.createJsonIndex(entityType, field);
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  transaction<T>(callback: (manager: EntityManager) => T): T {
    const transactionFn = this.db.transaction(callback);
    return transactionFn(this);
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      queryStats: Object.fromEntries(this.queryStats),
      pendingIndexes: Array.from(this.indexQueue)
    };
  }

  clearAllCache() {
    this.cache.clear();
  }
}

// Singleton instance
let entityManagerInstance: EntityManager | null = null;

export function getEntityManager(): EntityManager {
  if (!entityManagerInstance) {
    entityManagerInstance = new EntityManager();
  }
  return entityManagerInstance;
}
