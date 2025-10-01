/**
 * Extracts entity schema information from app code
 * by analyzing fetch calls to /api/entities
 * 
 * This now works alongside schema-discovery.ts:
 * - schema-discovery.ts: Scans actual database for entity types and infers schemas
 * - schema-extractor.ts: Parses app code to find which entities the app uses
 */

export interface EntitySchema {
  entityType: string;
  fields: string[];
  example: Record<string, any>;
}

/**
 * Extract which entity types an app uses from its code
 */
export function extractEntityTypesFromCode(code: string): string[] {
  const entityTypes = new Set<string>();
  
  try {
    // Match entityType: 'something' or entityType: "something"
    const entityTypeRegex = /entityType:\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = entityTypeRegex.exec(code)) !== null) {
      entityTypes.add(match[1]);
    }
    
    return Array.from(entityTypes);
  } catch (error) {
    console.error('Error extracting entity types:', error);
    return [];
  }
}

export function extractSchemasFromCode(code: string): EntitySchema[] {
  const schemas: Map<string, EntitySchema> = new Map();
  
  try {
    // Match fetch calls to /api/entities with POST method - improved regex
    // This handles multi-line JSON.stringify calls better
    const createRegex = /fetch\(['"`]\/api\/entities['"`],\s*\{[\s\S]*?method:\s*['"`]POST['"`][\s\S]*?body:\s*JSON\.stringify\(\{[\s\S]*?entityType:\s*['"`]([^'"`]+)['"`][\s\S]*?data:\s*\{([^}]*)\}[\s\S]*?\}\)/g;
    
    let match;
    while ((match = createRegex.exec(code)) !== null) {
      const entityType = match[1];
      const dataString = match[2];
      
      // Extract field names from the data object
      // Match field: value patterns
      const fieldRegex = /(\w+)\s*:/g;
      const fields: string[] = [];
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(dataString)) !== null) {
        const fieldName = fieldMatch[1];
        if (!fields.includes(fieldName) && fieldName !== 'entityType') {
          fields.push(fieldName);
        }
      }
      
      if (!schemas.has(entityType) && fields.length > 0) {
        schemas.set(entityType, {
          entityType,
          fields,
          example: {}
        });
      } else if (schemas.has(entityType)) {
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

