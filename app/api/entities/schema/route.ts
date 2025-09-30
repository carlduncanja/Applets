import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { schema } = await request.json();
    
    if (!schema || !schema.type || !schema.fields) {
      return NextResponse.json(
        { error: 'Valid schema with type and fields is required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    em.registerSchema(schema);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
