import { NextRequest, NextResponse } from 'next/server';
import { generateApplication } from '@/lib/ai-client';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { prompt, appName } = await request.json();
    
    if (!prompt || !appName) {
      return NextResponse.json(
        { error: 'prompt and appName are required' },
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

    // Generate the app using Claude
    const generatedApp = await generateApplication({
      prompt,
      appName
    });

    // Store the generated app in the database
    const em = getEntityManager();
    const savedApp = em.create('app', {
      name: generatedApp.name,
      description: generatedApp.description,
      prompt: prompt,
      code: generatedApp.code,
      componentType: generatedApp.componentType,
      requiredData: generatedApp.requiredData || [],
      status: 'active',
      version: 1,
      createdBy: 'user',
      executions: 0,
      lastExecuted: null
    }, {
      generationModel: 'claude-sonnet-4-5-20250929',
      generatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      app: savedApp
    });
  } catch (error: any) {
    console.error('App generation error:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to generate application';
    
    if (error.status === 400) {
      errorMessage = 'Invalid API request. Please check your AIML_API_KEY and ensure it\'s valid.';
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please check your AIML_API_KEY.';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a few moments.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot reach AI API. Please check your internet connection.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;