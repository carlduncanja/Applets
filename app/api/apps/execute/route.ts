import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { appId } = await request.json();
    
    if (!appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    
    // Get the app
    const app = em.findById(appId);
    
    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Update execution count
    em.update(appId, {
      executions: (app.data.executions || 0) + 1,
      lastExecuted: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      app: app
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute app' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
