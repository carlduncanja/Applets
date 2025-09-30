import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { entityType, data, metadata } = await request.json();
    
    if (!entityType || !data) {
      return NextResponse.json(
        { error: 'entityType and data are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const entity = em.create(entityType, data, metadata || {});

    return NextResponse.json(entity);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
