import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { prompt, availableApps, currentStep, stepData, availableApiKeys } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    const client = getAIClient();
    
    const systemPrompt = `You are a multi-step planning AI agent for AI-OS. Break down complex tasks into sequential steps.

Available apps: ${availableApps?.map((a: any) => a.name).join(', ') || 'none'}
Available API keys: ${availableApiKeys?.join(', ') || 'none configured'}
${currentStep ? `Current step: ${currentStep}\nPrevious step data: ${JSON.stringify(stepData)}` : ''}

Your job is to:
1. Analyze the user's request
2. Determine if it needs multiple steps (query data first, then act)
3. Plan the steps needed
4. Return the next step to execute

Return ONLY a JSON object:
{
  "needsMultiStep": true/false,
  "totalSteps": number,
  "currentStepNumber": number,
  "steps": [
    {
      "type": "query" | "action" | "analysis" | "confirmation",
      "description": "What this step does",
      "intent": "question" | "data_action" | "create" | etc,
      "query": "SQL-like query or question",
      "dataAction": {...},
      "requiresConfirmation": true/false
    }
  ],
  "nextStep": {
    "type": "query" | "action" | "analysis" | "confirmation",
    "description": "User-friendly description of what's happening",
    "intent": "question" | "data_action" | "create",
    "query": "question to ask" (for query type),
    "dataAction": {...} (for action type),
    "message": "Message to show user about this step"
  },
  "isComplete": true/false,
  "finalMessage": "Summary of what was accomplished"
}

Examples of multi-step tasks:
- "delete the 5 oldest notes" → Step 1: Query to find oldest notes, Step 2: Show list, Step 3: Delete them
- "mark all overdue todos as urgent" → Step 1: Query overdue todos, Step 2: Update them with count
- "show me my top 3 priority tasks and mark them done" → Step 1: Query top 3, Step 2: Show them, Step 3: Mark as done
- "delete all notes about X" → Step 1: Query notes matching X, Step 2: Confirm count, Step 3: Delete

Single-step tasks (return needsMultiStep: false):
- "delete all notes" → Direct action
- "create 5 todos" → Direct action
- "what do I have to do today" → Direct query`;

    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-5-20250929',
      messages: [
        {
          role: 'user',
          content: systemPrompt + '\n\nUser request: ' + prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      return NextResponse.json(parsed);
    } catch (error) {
      console.error('Failed to parse plan:', content);
      return NextResponse.json({
        needsMultiStep: false,
        message: 'Failed to create plan'
      });
    }
  } catch (error: any) {
    console.error('Planning error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to plan steps' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

