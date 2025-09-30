import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function PUT(request: NextRequest) {
  try {
    const { appId, code, saveAsNewVersion } = await request.json();
    
    if (!appId || !code) {
      return NextResponse.json(
        { error: 'appId and code are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    
    // Get the current app
    const app = em.findById(appId);
    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    let updateData: any = { code };

    // If saving as new version, preserve history
    if (saveAsNewVersion) {
      const currentVersion = app.data.version || 1;
      const versionHistory = app.data.versionHistory || [];
      
      versionHistory.push({
        version: currentVersion,
        code: app.data.code,
        description: app.data.description,
        prompt: app.data.prompt,
        timestamp: new Date().toISOString()
      });

      updateData = {
        ...updateData,
        version: currentVersion + 1,
        versionHistory: versionHistory,
        lastManualEdit: {
          timestamp: new Date().toISOString(),
          type: 'direct_code_edit'
        }
      };
    } else {
      updateData.lastManualEdit = {
        timestamp: new Date().toISOString(),
        type: 'quick_edit'
      };
    }

    // Update the app
    const updatedApp = em.update(appId, updateData);

    return NextResponse.json({
      success: true,
      app: updatedApp
    });
  } catch (error: any) {
    console.error('Code update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update code' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
