/**
 * Schema Discovery & SQL Query Generation
 * 
 * This module provides:
 * 1. Dynamic schema discovery from the database
 * 2. Direct SQL query generation from intents
 * 3. Schema tracking per application
 */

import { getDatabase } from './database';
import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  nullable: boolean;
  sample?: any;
}

export interface EntityTypeSchema {
  entityType: string;
  fields: FieldSchema[];
  sampleRecord?: any;
  recordCount: number;
}

export interface DatabaseSchema {
  entityTypes: EntityTypeSchema[];
  totalRecords: number;
  lastScanned: string;
}

/**
 * Scan the database and infer schemas from actual data
 */
export function discoverDatabaseSchemas(): DatabaseSchema {
  const db = getDatabase();
  
  // Get all entity types
  const entityTypesResult = db.prepare(`
    SELECT entity_type, COUNT(*) as count
    FROM entities
    WHERE deleted_at IS NULL
    GROUP BY entity_type
    ORDER BY count DESC
  `).all() as Array<{ entity_type: string; count: number }>;
  
  const entityTypes: EntityTypeSchema[] = [];
  let totalRecords = 0;
  
  for (const { entity_type, count } of entityTypesResult) {
    totalRecords += count;
    
    // Get sample records to infer schema
    const sampleRecords = db.prepare(`
      SELECT data
      FROM entities
      WHERE entity_type = ? AND deleted_at IS NULL
      LIMIT 10
    `).all(entity_type) as Array<{ data: string }>;
    
    if (sampleRecords.length === 0) continue;
    
    // Parse all sample records and collect all fields
    const fieldMap = new Map<string, FieldSchema>();
    
    for (const record of sampleRecords) {
      try {
        const data = JSON.parse(record.data);
        
        for (const [key, value] of Object.entries(data)) {
          if (!fieldMap.has(key)) {
            fieldMap.set(key, {
              name: key,
              type: inferType(value),
              nullable: value === null || value === undefined,
              sample: value
            });
          } else {
            // Update nullable status if we find a null/undefined
            const existing = fieldMap.get(key)!;
            if (value === null || value === undefined) {
              existing.nullable = true;
            }
          }
        }
      } catch (e) {
        // Skip malformed records
        continue;
      }
    }
    
    const firstRecord = JSON.parse(sampleRecords[0].data);
    
    entityTypes.push({
      entityType: entity_type,
      fields: Array.from(fieldMap.values()),
      sampleRecord: firstRecord,
      recordCount: count
    });
  }
  
  return {
    entityTypes,
    totalRecords,
    lastScanned: new Date().toISOString()
  };
}

/**
 * Infer the type of a value
 */
function inferType(value: any): FieldSchema['type'] {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  
  // Check if it's a date string
  if (typeof value === 'string') {
    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    if (datePattern.test(value)) return 'date';
  }
  
  return 'string';
}

/**
 * Format schemas for AI consumption
 */
export function formatSchemasForAI(schemas: DatabaseSchema): string {
  if (schemas.entityTypes.length === 0) {
    return 'No data in database yet.';
  }
  
  let output = `**Database Schema** (${schemas.totalRecords} total records)\n\n`;
  
  for (const entityType of schemas.entityTypes) {
    output += `**${entityType.entityType}** (${entityType.recordCount} records)\n`;
    output += `Fields: ${entityType.fields.map(f => {
      const nullable = f.nullable ? '?' : '';
      return `${f.name}${nullable}: ${f.type}`;
    }).join(', ')}\n\n`;
  }
  
  return output;
}

/**
 * Generate SQL queries from data action intents
 */
export class SQLQueryGenerator {
  private db: Database.Database;
  
  constructor() {
    this.db = getDatabase();
  }
  
  /**
   * Execute a data action directly with SQL
   */
  executeDataAction(dataAction: any): { success: boolean; count: number; message: string; error?: string } {
    const { action, entityType, data, updates, filters, items } = dataAction;
    
    try {
      switch (action) {
        case 'create':
          return this.executeCreate(entityType, data);
        
        case 'createMany':
          return this.executeCreateMany(entityType, items || []);
        
        case 'update':
        case 'updateMany':
          return this.executeUpdate(entityType, filters || {}, updates);
        
        case 'delete':
        case 'deleteMany':
          return this.executeDelete(entityType, filters || {});
        
        case 'deleteAll':
          return this.executeDeleteAll(entityType);
        
        case 'toggle':
          return this.executeToggle(entityType, filters || {}, dataAction.field);
        
        default:
          return {
            success: false,
            count: 0,
            message: `Unknown action: ${action}`,
            error: 'Unknown action'
          };
      }
    } catch (error: any) {
      return {
        success: false,
        count: 0,
        message: `SQL execution failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * CREATE - Insert a single record
   */
  private executeCreate(entityType: string, data: any): { success: boolean; count: number; message: string } {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    // Add timestamps if not present
    if (!data.created_at) data.created_at = now;
    if (!data.updated_at) data.updated_at = now;
    
    const stmt = this.db.prepare(`
      INSERT INTO entities (id, entity_type, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      id,
      entityType,
      JSON.stringify(data),
      now,
      now
    );
    
    return {
      success: true,
      count: result.changes,
      message: `Created ${entityType}`
    };
  }
  
  /**
   * CREATE MANY - Insert multiple records
   */
  private executeCreateMany(entityType: string, items: any[]): { success: boolean; count: number; message: string } {
    const stmt = this.db.prepare(`
      INSERT INTO entities (id, entity_type, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction((records: any[]) => {
      let count = 0;
      for (const data of records) {
        const id = randomUUID();
        const now = new Date().toISOString();
        
        if (!data.created_at) data.created_at = now;
        if (!data.updated_at) data.updated_at = now;
        
        stmt.run(id, entityType, JSON.stringify(data), now, now);
        count++;
      }
      return count;
    });
    
    const count = transaction(items);
    
    return {
      success: true,
      count,
      message: `Created ${count} ${entityType}(s)`
    };
  }
  
  /**
   * UPDATE - Update records matching filters
   */
  private executeUpdate(entityType: string, filters: any, updates: any): { success: boolean; count: number; message: string } {
    // First, find matching records
    const records = this.findRecords(entityType, filters);
    
    if (records.length === 0) {
      return {
        success: true,
        count: 0,
        message: `No ${entityType}(s) found matching filters`
      };
    }
    
    // Update each record
    const stmt = this.db.prepare(`
      UPDATE entities
      SET data = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const transaction = this.db.transaction((recs: any[]) => {
      let count = 0;
      for (const record of recs) {
        const data = JSON.parse(record.data);
        
        // Apply updates
        for (const [key, value] of Object.entries(updates)) {
          data[key] = value;
        }
        
        data.updated_at = new Date().toISOString();
        
        stmt.run(JSON.stringify(data), data.updated_at, record.id);
        count++;
      }
      return count;
    });
    
    const count = transaction(records);
    
    return {
      success: true,
      count,
      message: `Updated ${count} ${entityType}(s)`
    };
  }
  
  /**
   * DELETE - Soft delete records matching filters
   */
  private executeDelete(entityType: string, filters: any): { success: boolean; count: number; message: string } {
    const records = this.findRecords(entityType, filters);
    
    if (records.length === 0) {
      return {
        success: true,
        count: 0,
        message: `No ${entityType}(s) found matching filters`
      };
    }
    
    const stmt = this.db.prepare(`
      UPDATE entities
      SET deleted_at = ?
      WHERE id = ?
    `);
    
    const now = new Date().toISOString();
    const transaction = this.db.transaction((recs: any[]) => {
      for (const record of recs) {
        stmt.run(now, record.id);
      }
      return recs.length;
    });
    
    const count = transaction(records);
    
    return {
      success: true,
      count,
      message: `Deleted ${count} ${entityType}(s)`
    };
  }
  
  /**
   * DELETE ALL - Soft delete all records of a type
   */
  private executeDeleteAll(entityType: string): { success: boolean; count: number; message: string } {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      UPDATE entities
      SET deleted_at = ?
      WHERE entity_type = ? AND deleted_at IS NULL
    `);
    
    const result = stmt.run(now, entityType);
    
    return {
      success: true,
      count: result.changes,
      message: `Deleted all ${entityType}(s) (${result.changes} records)`
    };
  }
  
  /**
   * TOGGLE - Toggle a boolean field
   */
  private executeToggle(entityType: string, filters: any, field: string): { success: boolean; count: number; message: string } {
    const records = this.findRecords(entityType, filters);
    
    if (records.length === 0) {
      return {
        success: true,
        count: 0,
        message: `No ${entityType}(s) found matching filters`
      };
    }
    
    const stmt = this.db.prepare(`
      UPDATE entities
      SET data = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const transaction = this.db.transaction((recs: any[]) => {
      let count = 0;
      for (const record of recs) {
        const data = JSON.parse(record.data);
        
        // Toggle the field
        data[field] = !data[field];
        data.updated_at = new Date().toISOString();
        
        stmt.run(JSON.stringify(data), data.updated_at, record.id);
        count++;
      }
      return count;
    });
    
    const count = transaction(records);
    
    return {
      success: true,
      count,
      message: `Toggled ${field} for ${count} ${entityType}(s)`
    };
  }
  
  /**
   * Find records matching filters
   */
  private findRecords(entityType: string, filters: any): any[] {
    let query = `
      SELECT id, data, created_at, updated_at
      FROM entities
      WHERE entity_type = ? AND deleted_at IS NULL
    `;
    
    const params: any[] = [entityType];
    
    // If filters is empty, return all
    if (Object.keys(filters).length === 0) {
      return this.db.prepare(query).all(...params) as any[];
    }
    
    // Build WHERE clause for JSON filtering
    // Note: This is a simplified version. For production, you'd want more sophisticated filtering
    const results = this.db.prepare(query).all(...params) as any[];
    
    // Filter in memory based on JSON data
    return results.filter(record => {
      try {
        const data = JSON.parse(record.data);
        
        for (const [key, value] of Object.entries(filters)) {
          if (data[key] !== value) {
            return false;
          }
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }
  
  /**
   * Query records with flexible filtering
   */
  queryRecords(entityType: string, filters: any = {}, options: { limit?: number; orderBy?: string } = {}): any[] {
    const records = this.findRecords(entityType, filters);
    
    // Apply ordering if specified
    if (options.orderBy) {
      records.sort((a, b) => {
        const aData = JSON.parse(a.data);
        const bData = JSON.parse(b.data);
        
        const aVal = aData[options.orderBy!];
        const bVal = bData[options.orderBy!];
        
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }
    
    // Apply limit if specified
    if (options.limit) {
      return records.slice(0, options.limit);
    }
    
    return records;
  }
}

/**
 * Get singleton SQL query generator instance
 */
let sqlGeneratorInstance: SQLQueryGenerator | null = null;

export function getSQLQueryGenerator(): SQLQueryGenerator {
  if (!sqlGeneratorInstance) {
    sqlGeneratorInstance = new SQLQueryGenerator();
  }
  return sqlGeneratorInstance;
}

