import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { entityType, field, operation } = await request.json();
    
    if (!entityType || !field || !operation) {
      return NextResponse.json(
        { error: 'entityType, field, and operation are required' },
        { status: 400 }
      );
    }

    const validOperations = ['sum', 'avg', 'min', 'max', 'count'];
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const result = em.aggregate(entityType, field, operation);

    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
