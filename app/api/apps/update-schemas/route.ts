import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';
import { extractSchemasFromCode } from '@/lib/schema-extractor';

export async function POST(request: NextRequest) {
  try {
    const em = getEntityManager();
    
    // Get all apps
    const apps = em.find('app', {}, { cache: false });
    
    let updatedCount = 0;
    const results = [];
    
    for (const app of apps) {
      const currentSchemas = app.data.schemas || [];
      
      // Extract schemas from code
      const extractedSchemas = extractSchemasFromCode(app.data.code);
      
      // Only update if schemas changed
      if (extractedSchemas.length > 0 && JSON.stringify(currentSchemas) !== JSON.stringify(extractedSchemas)) {
        em.update(app.id, { schemas: extractedSchemas });
        updatedCount++;
        
        results.push({
          appName: app.data.name,
          schemas: extractedSchemas
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      updatedCount,
      totalApps: apps.length,
      results
    });
  } catch (error: any) {
    console.error('Schema update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update schemas' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

