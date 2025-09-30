import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function PUT(request: NextRequest) {
  try {
    const { id, data } = await request.json();
    
    if (!id || !data) {
      return NextResponse.json(
        { error: 'id and data are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const entity = em.replace(id, data);

    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entity);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
