/**
 * Extracts entity schema information from app code
 * by analyzing fetch calls to /api/entities
 */

export interface EntitySchema {
  entityType: string;
  fields: string[];
  example: Record<string, any>;
}

export function extractSchemasFromCode(code: string): EntitySchema[] {
  const schemas: Map<string, EntitySchema> = new Map();
  
  try {
    // Match fetch calls to /api/entities with POST method
    const createRegex = /fetch\(['"`]\/api\/entities['"`],\s*\{[^}]*method:\s*['"`]POST['"`][^}]*body:\s*JSON\.stringify\((\{[^}]*entityType:\s*['"`]([^'"`]+)['"`][^}]*data:\s*(\{[^}]+\})[^}]*\})\)/g;
    
    let match;
    while ((match = createRegex.exec(code)) !== null) {
      const entityType = match[2];
      const dataString = match[3];
      
      // Extract field names from the data object
      const fieldRegex = /(\w+):/g;
      const fields: string[] = [];
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(dataString)) !== null) {
        const fieldName = fieldMatch[1];
        if (!fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      }
      
      if (!schemas.has(entityType)) {
        schemas.set(entityType, {
          entityType,
          fields,
          example: {}
        });
      } else {
        // Merge fields
        const existing = schemas.get(entityType)!;
        fields.forEach(f => {
          if (!existing.fields.includes(f)) {
            existing.fields.push(f);
          }
        });
      }
    }
    
    // Also check findEntities calls to understand query patterns
    const findRegex = /entityType:\s*['"`]([^'"`]+)['"`][^}]*filters:\s*(\{[^}]*\})/g;
    while ((match = findRegex.exec(code)) !== null) {
      const entityType = match[1];
      const filtersString = match[2];
      
      const fieldRegex = /(\w+):/g;
      const fields: string[] = [];
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(filtersString)) !== null) {
        const fieldName = fieldMatch[1];
        if (!fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      }
      
      if (schemas.has(entityType)) {
        const existing = schemas.get(entityType)!;
        fields.forEach(f => {
          if (!existing.fields.includes(f)) {
            existing.fields.push(f);
          }
        });
      }
    }
    
    return Array.from(schemas.values());
  } catch (error) {
    console.error('Error extracting schemas:', error);
    return [];
  }
}

export function formatSchemasForAI(schemas: EntitySchema[]): string {
  if (schemas.length === 0) return 'No schemas defined yet.';
  
  return schemas.map(schema => 
    `${schema.entityType}: { ${schema.fields.join(', ')} }`
  ).join('\n');
}

