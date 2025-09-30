import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function DELETE(request: NextRequest) {
  try {
    const { entityType, filters, soft } = await request.json();
    
    if (!entityType || !filters) {
      return NextResponse.json(
        { error: 'entityType and filters are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const count = em.deleteMany(entityType, filters, soft !== false);

    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
