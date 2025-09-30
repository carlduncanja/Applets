import { NextRequest, NextResponse } from 'next/server';
import { generateApplication } from '@/lib/ai-client';
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

    // Check if API key is configured
    if (!process.env.AIML_API_KEY) {
      return NextResponse.json(
        { error: 'AIML_API_KEY is not configured. Please add it to your .env.local file.' },
        { status: 500 }
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

    // Save current version to history
    const currentVersion = app.data.version || 1;
    const versionHistory = app.data.versionHistory || [];
    
    versionHistory.push({
      version: currentVersion,
      code: app.data.code,
      description: app.data.description,
      prompt: app.data.prompt,
      timestamp: new Date().toISOString()
    });

    // Regenerate the app using the original prompt
    const generatedApp = await generateApplication({
      prompt: app.data.prompt,
      appName: app.data.name
    });

    // Update the app with new version
    const updatedApp = em.update(appId, {
      code: generatedApp.code,
      description: generatedApp.description,
      version: currentVersion + 1,
      versionHistory: versionHistory,
      lastRegeneration: {
        reason: 'Manual regeneration to fix display issues',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      app: updatedApp
    });
  } catch (error: any) {
    console.error('App regeneration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate application' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
