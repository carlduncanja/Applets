import OpenAI from 'openai';

export function getAIClient() {
  const apiKey = process.env.AIML_API_KEY;
  
  if (!apiKey) {
    throw new Error('AIML_API_KEY is not set in environment variables');
  }

  return new OpenAI({
    baseURL: process.env.AIML_BASE_URL || 'https://api.aimlapi.com/v1',
    apiKey: apiKey,
  });
}

export interface AppGenerationRequest {
  prompt: string;
  appName: string;
}

export interface GeneratedApp {
  name: string;
  description: string;
  code: string;
  componentType: 'react' | 'form' | 'dashboard' | 'tool';
  requiredData?: string[];
  htmlOutput?: string;
}

export async function generateApplication(request: AppGenerationRequest): Promise<GeneratedApp> {
  const client = getAIClient();

  const systemPrompt = `You are an expert at generating complete, working React components for web applications.

Given a user's description, generate a fully functional React component that:
1. Is a complete, self-contained component
2. Uses modern React patterns (hooks, functional components)
3. Uses Tailwind CSS for styling
4. Includes all necessary logic and state management
5. Is production-ready code that can be directly executed
6. CRITICAL: Use React.createElement() instead of JSX syntax

Return a JSON object with this exact structure:
{
  "name": "ComponentName",
  "description": "Brief description of what the app does",
  "code": "The complete React component code as a string using React.createElement",
  "componentType": "react" | "form" | "dashboard" | "tool",
  "requiredData": ["optional array of data fields needed"]
}

CRITICAL REQUIREMENTS:
- DO NOT use JSX syntax (no <div>, <button>, etc.)
- Use React.createElement() for all elements
- Example: React.createElement('div', { className: 'p-4' }, 'Hello')
- For multiple children, pass them as additional arguments or an array
- Use Tailwind CSS classes in className prop
- Make it visually appealing with the same design system (oklch colors, rounded corners, shadows)
- Include error handling and loading states where appropriate
- Make it interactive and functional
- DO NOT include markdown code fences, just return the JSON
- The code must be executable without any transpilation

Example of correct format:
const Component = () => {
  const [count, setCount] = useState(0);
  return React.createElement('div', { className: 'p-4' },
    React.createElement('h1', { className: 'text-2xl font-bold' }, 'Counter: ' + count),
    React.createElement('button', { 
      className: 'bg-blue-500 text-white px-4 py-2 rounded',
      onClick: () => setCount(count + 1)
    }, 'Increment')
  );
};`;

  const userPrompt = `Create a web application component with the following requirements:

Application Name: ${request.appName}
Description: ${request.prompt}

Generate a complete, working React component for this application.`;

  const response = await client.chat.completions.create({
    model: 'claude-sonnet-4-5-20250929',
    messages: [
      {
        role: 'user',
        content: systemPrompt + '\n\n' + userPrompt
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content;
  
  if (!content) {
    throw new Error('No response from AI');
  }

  // Parse the JSON response
  try {
    // Remove any markdown code fences if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return parsed as GeneratedApp;
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI-generated application');
  }
}
