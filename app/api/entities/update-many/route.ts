import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function PUT(request: NextRequest) {
  try {
    const { entityType, filters, updates } = await request.json();
    
    if (!entityType || !filters || !updates) {
      return NextResponse.json(
        { error: 'entityType, filters, and updates are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const count = em.updateMany(entityType, filters, updates);

    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
