import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { entityType, records } = await request.json();
    
    if (!entityType || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'entityType and records array are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const entities = em.createMany(entityType, records);

    return NextResponse.json(entities);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
