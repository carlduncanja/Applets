import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function DELETE(request: NextRequest) {
  try {
    const { id, soft } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    
    // Get entity type before deletion
    const entity = em.findById(id, { cache: false });
    const entityType = entity?.entity_type;
    
    const success = em.delete(id, soft !== false);

    return NextResponse.json({ success, entityType });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
