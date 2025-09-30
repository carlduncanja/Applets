import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { appId, iterationPrompt } = await request.json();
    
    if (!appId || !iterationPrompt) {
      return NextResponse.json(
        { error: 'appId and iterationPrompt are required' },
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

    // Generate the improved version using Claude
    const client = getAIClient();
    
    const systemPrompt = `You are an expert at improving and modifying React components based on user feedback.

CRITICAL REQUIREMENTS:
- DO NOT use JSX syntax (no <div>, <button>, etc.)
- Use React.createElement() for all elements
- Maintain the same component name: ${app.data.name}
- Keep the overall structure but apply the requested changes
- The code must be executable without any transpilation
- PREVENT OVERFLOW: Use h-screen flex flex-col for full-page apps, overflow-auto for scrollable areas
- NEVER let content extend beyond viewport - always add max-height and overflow constraints
- **NEVER use emojis** (❌ 🎉 ✅ 📝 etc.) - use text or Lucide icons only
- Follow v0-style minimal design: clean, professional, generous whitespace

Current component code:
\`\`\`javascript
${app.data.code}
\`\`\`

Original description: ${app.data.description}

User's improvement request: ${iterationPrompt}

Generate an improved version that incorporates the user's feedback.

Return a JSON object with this exact structure:
{
  "name": "${app.data.name}",
  "description": "Updated description reflecting the changes",
  "code": "The improved React component code using React.createElement",
  "componentType": "${app.data.componentType}",
  "changes": "Brief summary of what was changed"
}`;

    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-5-20250929',
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 16000,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let improved;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      improved = JSON.parse(cleanContent);
    } catch (error) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI-generated improvement');
    }

    // Update the app with new version
    const updatedApp = em.update(appId, {
      code: improved.code,
      description: improved.description,
      version: currentVersion + 1,
      versionHistory: versionHistory,
      lastIteration: {
        prompt: iterationPrompt,
        changes: improved.changes || 'Improvements applied',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      app: updatedApp,
      changes: improved.changes
    });
  } catch (error: any) {
    console.error('App iteration error:', error);
    
    let errorMessage = error.message || 'Failed to iterate on application';
    
    if (error.status === 400) {
      errorMessage = 'Invalid API request. Please check your AIML_API_KEY and ensure it\'s valid.';
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please check your AIML_API_KEY.';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a few moments.';
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
