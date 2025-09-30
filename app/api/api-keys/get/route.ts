import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

// GET a specific API key value (for applets to use)
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const keys = em.find('api_key', { name });
    
    if (keys.length > 0) {
      return NextResponse.json({
        success: true,
        value: keys[0].data.value
      });
    } else {
      return NextResponse.json(
        { error: 'API key not found', value: null },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('API key get error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get API key', value: null },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

