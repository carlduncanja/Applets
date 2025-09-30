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
  image?: string;
}

export interface GeneratedApp {
  name: string;
  description: string;
  code: string;
  componentType: 'react' | 'form' | 'dashboard' | 'tool';
  requiredData?: string[];
}

export async function generateApplication(request: AppGenerationRequest): Promise<GeneratedApp> {
  const client = getAIClient();

  const systemPrompt = `You are an expert at generating complete, working React components using shadcn UI and Tailwind CSS.

AVAILABLE SHADCN COMPONENTS (use these instead of HTML elements):
- Button: React.createElement(Button, { variant: 'default'|'destructive'|'outline'|'secondary'|'ghost', size: 'default'|'sm'|'lg'|'icon', onClick: fn }, 'Text')
- Input: React.createElement(Input, { value, onChange: fn, placeholder: '...' })
- Label: React.createElement(Label, { htmlFor: 'id' }, 'Label text')
- Card: React.createElement(Card, { className: '...' }, children)
- CardHeader, CardTitle, CardDescription, CardContent: Card sub-components
- Badge: React.createElement(Badge, { variant: 'default'|'secondary'|'destructive'|'outline' }, 'Text')
- Textarea: React.createElement(Textarea, { value, onChange: fn, rows: 4 })

You can also use HTML elements: 'div', 'span', 'h1', 'h2', 'h3', 'p', 'img', 'form'

FILE UPLOADS (CRITICAL - USE THIS EXACT PATTERN):
ALWAYS use the triggerFileInput helper function:

const fileInputRef = useRef(null);

const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      // Save to database or use directly
    };
    reader.readAsDataURL(file);
  }
};

// Hidden input
React.createElement('input', {
  ref: fileInputRef,
  type: 'file',
  accept: 'image/*',
  onChange: handleFileChange,
  style: { display: 'none' }
})

// Trigger button - use triggerFileInput helper
React.createElement(Button, {
  onClick: () => triggerFileInput(fileInputRef)
}, 'Upload Image')

// Or clickable div
React.createElement('div', {
  onClick: () => triggerFileInput(fileInputRef),
  className: 'cursor-pointer border-2 border-dashed p-8 text-center hover:border-primary'
}, 'Click to upload')

Return a JSON object with this exact structure:
{
  "name": "ComponentName",
  "description": "Brief description of what the app does",
  "code": "The complete React component code using React.createElement",
  "componentType": "react" | "form" | "dashboard" | "tool"
}

CRITICAL RULES:
1. Use React.createElement() for ALL components (no JSX)
2. NEVER define custom components inside (no const Button = ...)
3. ALWAYS use shadcn Button component instead of HTML button/input
4. ALWAYS wrap apps in Card with CardHeader, CardTitle, CardContent
5. Use proper Tailwind classes for layout (grid, flex)
6. MANDATORY: Support light AND dark modes with theme colors
7. NEVER use hardcoded colors (no slate-500, blue-500, gray-700, etc.)
8. Create polished, professional Apple-style interfaces

STYLING FOR LIGHT/DARK MODE (MANDATORY):
NEVER use hardcoded colors like bg-black, bg-white, bg-gray-700, text-black, text-white
ALWAYS use theme-aware classes:
- Page background: 'bg-background'
- Text color: 'text-foreground'
- Card background: 'bg-card text-card-foreground'
- Muted areas: 'bg-muted text-muted-foreground'  
- Primary actions: 'bg-primary text-primary-foreground'
- Secondary: 'bg-secondary text-secondary-foreground'
- Borders: 'border border-border'
- Accent: 'bg-accent text-accent-foreground'

DESIGN REQUIREMENTS FOR ALL APPS:
1. Wrap in Card: React.createElement(Card, { className: 'w-full max-w-md shadow-2xl' })
2. Add CardHeader with title
3. Use CardContent for main content
4. Round buttons: 'rounded-full' or 'rounded-xl'
5. Generous padding: 'p-8', 'px-6 py-4'
6. Shadows: 'shadow-lg', 'shadow-2xl'
7. Centered layout: 'flex items-center justify-center min-h-screen bg-background'
8. Input styling: Use shadcn Input component
9. NEVER use HTML input/button - ONLY shadcn components

BUTTON VARIANTS:
- variant='secondary' for regular buttons (numbers, items)
- variant='default' for primary actions (operators, submit)
- variant='outline' for secondary actions
- variant='destructive' for delete
- Size: 'h-16' to 'h-20' for touch-friendly
- Font: 'text-2xl' or 'text-3xl' for large buttons

EXAMPLE TODO LIST (CORRECT STYLING):
const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  
  useEffect(() => {
    // Load from database
    fetch('/api/entities/find', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'todo', filters: {} })
    }).then(res => res.json()).then(setTodos);
  }, []);
  
  const addTodo = async () => {
    const res = await fetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'todo',
        data: { text: input, completed: false }
      })
    });
    setTodos([await res.json(), ...todos]);
    setInput('');
  };
  
  return React.createElement('div', { className: 'min-h-screen bg-background p-8 flex items-center justify-center' },
    React.createElement(Card, { className: 'w-full max-w-2xl shadow-2xl' },
      React.createElement(CardHeader, {},
        React.createElement(CardTitle, { className: 'text-3xl' }, 'Todo List'),
        React.createElement(CardDescription, {}, todos.filter(t => !t.data.completed).length + ' tasks remaining')
      ),
      React.createElement(CardContent, { className: 'space-y-4' },
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement(Input, {
            value: input,
            onChange: (e) => setInput(e.target.value),
            placeholder: 'Add a task...',
            className: 'flex-1 h-12'
          }),
          React.createElement(Button, {
            onClick: addTodo,
            className: 'h-12 px-6'
          }, 'Add')
        ),
        React.createElement('div', { className: 'space-y-2' },
          todos.map(todo =>
            React.createElement('div', {
              key: todo.id,
              className: 'flex items-center gap-3 p-4 bg-muted rounded-xl hover:bg-accent transition-colors'
            },
              React.createElement(Button, {
                variant: 'ghost',
                size: 'icon',
                className: 'h-6 w-6 rounded-full',
                onClick: () => toggleTodo(todo)
              }, todo.data.completed ? '✓' : '○'),
              React.createElement('span', {
                className: todo.data.completed ? 'flex-1 line-through text-muted-foreground' : 'flex-1'
              }, todo.data.text),
              React.createElement(Button, {
                variant: 'ghost',
                size: 'icon',
                onClick: () => deleteTodo(todo.id)
              }, '×')
            )
          )
        )
      )
    )
  );
};

EXAMPLE CALCULATOR (4-COLUMN GRID - THEME AWARE):
const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [operation, setOperation] = useState(null);
  
  const handleNumber = (num) => {
    setDisplay(display === '0' ? String(num) : display + num);
  };
  
  return React.createElement('div', { className: 'min-h-screen bg-background p-4 flex items-center justify-center' },
    React.createElement(Card, { className: 'w-full max-w-sm shadow-2xl' },
      React.createElement(CardHeader, {},
        React.createElement(CardTitle, {}, 'Calculator')
      ),
      React.createElement(CardContent, { className: 'space-y-4' },
        React.createElement('div', { className: 'text-right text-5xl font-bold text-foreground bg-muted rounded-xl p-6' }, display),
        React.createElement('div', { className: 'grid grid-cols-4 gap-2' },
          // Function row - use secondary for visibility
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-lg font-semibold', onClick: () => setDisplay('0') }, 'AC'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-lg font-semibold' }, '+/-'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-lg font-semibold' }, '%'),
          React.createElement(Button, { variant: 'default', className: 'h-16 text-xl font-semibold', onClick: () => setOperation('÷') }, '÷'),
          // Number rows - use secondary for better visibility than outline
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(7) }, '7'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(8) }, '8'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(9) }, '9'),
          React.createElement(Button, { variant: 'default', className: 'h-16 text-xl font-semibold', onClick: () => setOperation('×') }, '×'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(4) }, '4'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(5) }, '5'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(6) }, '6'),
          React.createElement(Button, { variant: 'default', className: 'h-16 text-xl font-semibold', onClick: () => setOperation('-') }, '-'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(1) }, '1'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(2) }, '2'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold', onClick: () => handleNumber(3) }, '3'),
          React.createElement(Button, { variant: 'default', className: 'h-16 text-xl font-semibold', onClick: () => setOperation('+') }, '+'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold col-span-2', onClick: () => handleNumber(0) }, '0'),
          React.createElement(Button, { variant: 'secondary', className: 'h-16 text-xl font-semibold' }, '.'),
          React.createElement(Button, { variant: 'default', className: 'h-16 text-xl font-semibold' }, '=')
        )
      )
    )
  );
};

This creates a proper grid calculator that works in both light and dark mode!

DATABASE INTEGRATION (BUILT-IN):
Your apps have access to a schema-flexible entity database. Use these API endpoints for persistence:

1. CREATE ENTITY:
fetch('/api/entities', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entityType: 'todo',
    data: { text: 'Buy milk', completed: false }
  })
}).then(res => res.json())

2. FIND ENTITIES:
fetch('/api/entities/find', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entityType: 'todo',
    filters: { completed: false },
    options: { orderBy: 'created_at', orderDirection: 'DESC' }
  })
}).then(res => res.json())

3. UPDATE ENTITY:
fetch('/api/entities/update', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: entityId,
    updates: { completed: true }
  })
}).then(res => res.json())

4. DELETE ENTITY:
fetch('/api/entities/delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: entityId,
    soft: true
  })
}).then(res => res.json())

ENTITY STRUCTURE:
Each entity has: { id, entity_type, data, version, created_at, updated_at }
The "data" field contains your custom object

EXAMPLE TODO APP WITH DATABASE:
const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load todos from database on mount
    fetch('/api/entities/find', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'todo', filters: {} })
    })
      .then(res => res.json())
      .then(data => {
        setTodos(data);
        setLoading(false);
      });
  }, []);

  const addTodo = async () => {
    const response = await fetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'todo',
        data: { text: input, completed: false }
      })
    });
    const newTodo = await response.json();
    setTodos([...todos, newTodo]);
    setInput('');
  };

  const toggleTodo = async (todo) => {
    await fetch('/api/entities/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: todo.id,
        updates: { completed: !todo.data.completed }
      })
    });
    // Reload todos
    const res = await fetch('/api/entities/find', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'todo', filters: {} })
    });
    setTodos(await res.json());
  };

  // Render with React.createElement...
};

IMPORTANT:
- Return valid JSON only (no markdown, no code fences)
- MANDATORY: Use shadcn Button component, not HTML button
- MANDATORY: Use theme-aware classes (bg-background, text-foreground, bg-card, bg-muted)
- NEVER use hardcoded colors (no bg-black, bg-white, bg-gray-700, text-black, text-white)
- Wrap all apps in Card component
- grid grid-cols-4 gap-2 creates perfect 4-column layout
- DO NOT create helper components inside
- Apps must look good in BOTH light and dark mode
- Use database API for persistence when user needs data to persist
- Use entityType that matches the app (todo, note, contact, product, etc.)`;

  const userPrompt = `Create a web application component with the following requirements:

Application Name: ${request.appName}
Description: ${request.prompt}
${request.image ? '\n\nReference image provided: Use this as design inspiration for colors, layout, and styling.' : ''}

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
