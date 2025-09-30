import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { appId, targetVersion } = await request.json();
    
    if (!appId || targetVersion === undefined) {
      return NextResponse.json(
        { error: 'appId and targetVersion are required' },
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

    const versionHistory = app.data.versionHistory || [];
    
    // Find the target version
    const targetVersionData = versionHistory.find((v: any) => v.version === targetVersion);
    
    if (!targetVersionData) {
      return NextResponse.json(
        { error: `Version ${targetVersion} not found in history` },
        { status: 404 }
      );
    }

    // Save current state before rollback
    const currentVersion = app.data.version || 1;
    const updatedHistory = [...versionHistory];
    
    // Add current version to history if not already there
    if (!updatedHistory.find((v: any) => v.version === currentVersion)) {
      updatedHistory.push({
        version: currentVersion,
        code: app.data.code,
        description: app.data.description,
        prompt: app.data.prompt,
        timestamp: new Date().toISOString()
      });
    }

    // Rollback to target version
    const updatedApp = em.update(appId, {
      code: targetVersionData.code,
      description: targetVersionData.description,
      prompt: targetVersionData.prompt,
      version: targetVersion,
      versionHistory: updatedHistory,
      lastRollback: {
        fromVersion: currentVersion,
        toVersion: targetVersion,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      app: updatedApp,
      message: `Rolled back from version ${currentVersion} to version ${targetVersion}`
    });
  } catch (error: any) {
    console.error('App rollback error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rollback application' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
