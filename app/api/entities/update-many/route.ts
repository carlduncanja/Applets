import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function PUT(request: NextRequest) {
  try {
    const { entityType, filters, updates } = await request.json();
    
    if (!entityType || !updates) {
      return NextResponse.json(
        { error: 'entityType and updates are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    
    // Find all entities matching the filters
    const entities = em.find(entityType, filters || {});
    
    // Update each entity
    let count = 0;
    for (const entity of entities) {
      em.update(entity.id, updates);
      count++;
    }
    
    return NextResponse.json({
      success: true,
      count,
      message: `Updated ${count} ${entityType}(s)`
    });
  } catch (error: any) {
    console.error('Update many error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update entities' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
