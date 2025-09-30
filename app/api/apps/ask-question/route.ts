import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { question, relevantEntityTypes, chatHistory } = await request.json();
    
    if (!question) {
      return NextResponse.json(
        { error: 'question is required' },
        { status: 400 }
      );
    }

    if (!process.env.AIML_API_KEY) {
      return NextResponse.json(
        { error: 'AIML_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const em = getEntityManager();
    
    // Get ALL entity types from the database
    const db = (em as any).db;
    const entityTypesResult = db.prepare(`
      SELECT DISTINCT entity_type FROM entities WHERE deleted_at IS NULL
    `).all() as any[];
    
    const allEntityTypes = entityTypesResult.map((row: any) => row.entity_type);
    
    // Fetch ALL data from database (excluding 'app' entities which are the apps themselves)
    let contextData: any = {};
    let totalEntities = 0;
    
    for (const entityType of allEntityTypes) {
      if (entityType === 'app') continue; // Skip app definitions
      
      try {
        const entities = em.find(entityType, {}, { limit: 100 });
        if (entities.length > 0) {
          contextData[entityType] = entities.map(e => ({
            id: e.id,
            ...e.data,
            created_at: e.created_at,
            updated_at: e.updated_at
          }));
          totalEntities += entities.length;
        }
      } catch (err) {
        continue;
      }
    }

    const client = getAIClient();
    
    const conversationContext = chatHistory && chatHistory.length > 0 
      ? `\n\nPrevious conversation:\n${chatHistory.slice(-5).map((msg: any) => 
          `${msg.role === 'agent' ? 'Assistant' : 'User'}: ${msg.content || msg.question || msg.answer}`
        ).join('\n')}`
      : '';
    
    const systemPrompt = `You are a helpful assistant that answers questions about the user's data.

Total entities in database: ${totalEntities}
Entity types available: ${allEntityTypes.join(', ') || 'none'}${conversationContext}

Available data:
${JSON.stringify(contextData, null, 2)}

Important:
- Answer questions based ONLY on the data provided above
- Use previous conversation context to understand follow-up questions and references
- If user says "it", "that", "those", refer to previous context
- If asking about an app that stores data locally (not in database), explain that the app doesn't persist data to the database
- Be concise and helpful
- Format lists with bullet points or numbers
- If no relevant data exists, politely explain what data IS available

Return ONLY a JSON object:
{
  "answer": "your answer here",
  "foundData": true/false
}`;

    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-5-20250929',
      messages: [
        {
          role: 'user',
          content: systemPrompt + '\n\nQuestion: ' + question
        }
      ],
      temperature: 0.5,
      max_tokens: 500,
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
      console.error('Failed to parse answer:', content);
      return NextResponse.json({
        answer: content,
        foundData: true
      });
    }
  } catch (error: any) {
    console.error('Question answering error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to answer question' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
