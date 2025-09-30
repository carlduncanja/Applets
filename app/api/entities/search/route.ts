import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { entityType, searchTerm, options } = await request.json();
    
    if (!entityType || !searchTerm) {
      return NextResponse.json(
        { error: 'entityType and searchTerm are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const entities = em.search(entityType, searchTerm, options || {});

    return NextResponse.json(entities);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
