# AI Applets - Generative Application Platform

## Overview

The AI Applets feature allows you to **generate complete, working applications from simple text prompts** using Claude 4.5 Sonnet. Each generated app is saved to the database and displayed as an interactive card that you can run immediately.

## 🚀 Quick Start

### 1. Setup API Key

Create a `.env.local` file in the root directory:

```bash
AIML_API_KEY=your_api_key_here
AIML_BASE_URL=https://api.aimlapi.com/v1
```

Get your API key from: https://aimlapi.com

### 2. Start the Server

```bash
npm run dev
```

### 3. Create Your First App

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click on **AI Applets** (the featured purple card)
3. Click **Create App**
4. Fill in the form:
   - **App Name**: e.g., "Todo List"
   - **Description**: Describe what you want in detail

Example prompt:
```
Create a todo list app with the following features:
- Add new tasks with an input field
- Mark tasks as complete with a checkbox
- Delete tasks with a delete button  
- Show a counter of completed vs total tasks
- Use smooth animations when adding/removing tasks
- Style it with a modern, clean design using Tailwind CSS
- Use purple as the primary color
```

5. Click **Generate App** and wait 10-30 seconds
6. Your app will appear as a card - click **Run App** to use it!

## 📋 How It Works

### Architecture

```
User Prompt → Claude 4.5 Sonnet → Generated React Component → Stored in DB → Displayed as Card → Executable Applet
```

### The Process

1. **User Input**: You describe what you want to build
2. **AI Generation**: Claude generates a complete React component with:
   - Full component code
   - State management (useState, useEffect)
   - Event handlers
   - Tailwind CSS styling
   - Error handling
3. **Storage**: The app is saved in the entity database as an `app` entity
4. **Display**: App appears as a card on the dashboard
5. **Execution**: Click to run the app in an isolated view

### Database Schema

Apps are stored with this structure:
```typescript
{
  name: string           // App name
  description: string    // What the app does
  prompt: string         // Original user prompt
  code: string          // Generated React component code
  componentType: string  // 'react' | 'form' | 'dashboard' | 'tool'
  status: string        // 'active' | 'inactive'
  version: number       // Version number
  executions: number    // How many times it's been run
  lastExecuted: string  // Last execution timestamp
}
```

## 💡 Example Prompts

### Simple Todo List
```
Create a todo list where I can add, complete, and delete tasks.
Include a counter showing how many tasks are done.
Use a clean, modern design.
```

### Calculator
```
Build a calculator app with:
- Basic operations (+, -, ×, ÷)
- A display showing the current number
- Clear and equals buttons
- Number pad (0-9)
- Responsive design
- Purple gradient theme
```

### Pomodoro Timer
```
Create a pomodoro timer with:
- 25-minute work sessions
- 5-minute break sessions
- Start, pause, and reset buttons
- Visual progress indicator
- Sound notification when timer ends
- Count of completed sessions
```

### Weather Dashboard
```
Build a weather dashboard that shows:
- Current temperature
- Weather condition icon
- Humidity and wind speed
- 5-day forecast
- Search by city name
- Beautiful gradient background based on weather
```

### Budget Tracker
```
Create a budget tracker app with:
- Add income and expenses
- Categorize transactions
- Show total income, expenses, and balance
- Visual chart of spending by category
- Filter by date range
- Export data as CSV
```

## 🎨 Tips for Better Apps

### Be Specific
❌ "Make a todo app"
✅ "Create a todo app with drag-and-drop reordering, categories, due dates, and priority levels"

### Include Design Details
```
Use a purple and pink gradient theme with:
- Rounded corners (rounded-xl)
- Smooth shadows
- Hover animations
- Glass morphism effects
```

### Specify Functionality
```
Include these features:
1. Add items with Enter key
2. Edit items by clicking them
3. Delete with confirmation dialog
4. Save to localStorage
5. Filter by status (all/active/completed)
```

### Request Data Visualization
```
Show statistics with:
- Progress bar for completion
- Pie chart for categories
- Line graph for trends over time
```

## 🔧 Advanced Features

### Component Types

The AI automatically determines the component type:
- **react**: Interactive UI components
- **form**: Data collection forms
- **dashboard**: Data visualization
- **tool**: Utility applications

### Execution Tracking

Each app tracks:
- Total number of executions
- Last execution timestamp
- Creation date
- Version number

### Code Viewing

Click "View Code" to see the generated React component source code.

### Version Control

Future feature: Update apps with new prompts while maintaining version history.

## 🛠 API Usage

### Generate App (Server-Side Only)

```typescript
POST /api/apps/generate
Content-Type: application/json

{
  "appName": "Todo List",
  "prompt": "Create a todo list app..."
}

Response:
{
  "success": true,
  "app": {
    "id": "...",
    "data": {
      "name": "Todo List",
      "description": "...",
      "code": "...",
      ...
    }
  }
}
```

### Execute App

```typescript
POST /api/apps/execute
Content-Type: application/json

{
  "appId": "app-uuid"
}
```

## 🔐 Security Considerations

**Current Implementation (Development Only)**:
- Components are executed using Function constructor
- No sandboxing or isolation
- Direct access to React hooks

**Production Recommendations**:
1. Use iframe sandboxing with postMessage
2. Implement Web Workers for code execution
3. Use a proper code sandbox like CodeSandbox or StackBlitz API
4. Add rate limiting on app generation
5. Implement user authentication
6. Review generated code before execution
7. Add content security policy (CSP)

## 📊 Performance

- **Generation Time**: 10-30 seconds per app
- **Storage**: ~5-50KB per app (depends on complexity)
- **Execution**: Instant (already in memory)
- **Caching**: Apps are cached after first load

## 🐛 Troubleshooting

### App Won't Generate
- Check your API key in `.env.local`
- Ensure you have internet connection
- Try a simpler prompt first
- Check browser console for errors

### Component Won't Render
- View the code to check for syntax errors
- Check browser console for runtime errors
- Try regenerating with more specific requirements

### Slow Generation
- Claude API may be under load
- Complex prompts take longer
- Try breaking into smaller apps

## 🎯 Best Practices

1. **Start Simple**: Test with basic apps first
2. **Iterate**: Generate, test, then refine your prompt
3. **Be Descriptive**: More detail = better results
4. **Check Code**: Review generated code for quality
5. **Test Thoroughly**: Run apps before sharing
6. **Save Good Prompts**: Keep track of what works

## 🚧 Limitations

- No multi-file apps (single component only)
- No external API calls (yet)
- No package installations
- Limited to React + Tailwind CSS
- No state persistence between sessions (add localStorage in prompt)

## 🔮 Future Enhancements

- [ ] Multi-component apps
- [ ] NPM package support
- [ ] API integration
- [ ] App marketplace
- [ ] Collaborative editing
- [ ] Version control
- [ ] App templates
- [ ] Export to standalone project
- [ ] Mobile responsive testing
- [ ] Performance monitoring

## 🎨 UI/UX Features

- **Card Grid**: Visual representation of all apps
- **Quick Run**: One-click app execution
- **Live Preview**: See apps running in real-time
- **Code View**: Toggle source code display
- **Stats**: Track usage and popularity
- **Search**: Find apps quickly
- **Categories**: Filter by component type

---

Built with ❤️ using Claude 4.5 Sonnet and Next.js
