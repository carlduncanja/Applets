# Complete AI Applet Generator Guide

## 🎉 System Overview

You now have a **fully functional AI-powered application generator** that:
- Generates complete React applications from text prompts using Claude 4.5 Sonnet
- Stores apps in a schema-flexible SQLite database
- Displays apps as interactive cards
- Runs apps directly in the browser
- Supports complex logic and API calls
- Uses the same beautiful UI styling from your hackathon project

---

## 🚀 Quick Start

### 1. Setup (One-Time)

Edit `.env.local` and add your AIML API key:
```bash
AIML_API_KEY=your_actual_api_key_here
AIML_BASE_URL=https://api.aimlapi.com/v1
```

Get your key from: https://aimlapi.com

### 2. Start the Server

```bash
npm run dev
```

Open: http://localhost:3000

### 3. Create Your First App

1. Click **AI Applets** (purple gradient card)
2. Click **Create App**
3. Fill in the form:

**Example 1: Simple Counter**
```
App Name: Counter
Description: Create a counter with increment, decrement, and reset buttons. Use purple colors.
```

**Example 2: Todo List**
```
App Name: Todo List
Description: Create a todo list with add, complete, and delete functionality. Show a counter of completed tasks. Use smooth animations.
```

**Example 3: Calculator** (your current example)
```
App Name: Calculator
Description: Create a calculator with basic operations (+, -, ×, ÷), a display, number pad, and history of calculations. Use a gradient background.
```

4. Click **Generate App** (takes 10-30 seconds)
5. Click **Run App** on the generated card

---

## 💡 How It Works

### Architecture Flow

```
User Prompt
    ↓
Claude 4.5 Sonnet (generates React code using React.createElement)
    ↓
Saved to SQLite Database (entities table)
    ↓
Displayed as Card on Dashboard
    ↓
Click "Run App" → Component Loaded → Executed in Browser
```

### Why React.createElement()?

The AI generates code using `React.createElement()` instead of JSX because:
- JSX requires transpilation (Babel/TypeScript)
- We execute code directly in the browser
- `React.createElement()` is the runtime API that JSX compiles to

**Example:**
```javascript
// JSX (can't execute directly)
<div className="p-4">Hello</div>

// React.createElement (can execute directly)
React.createElement('div', { className: 'p-4' }, 'Hello')
```

### Component Detection

The loader automatically finds your component by checking for:
- `Component` (preferred)
- `Calculator`, `TodoList`, `Counter`, `Dashboard`, `Form`, `App`
- Any function/const starting with a capital letter

---

## 📝 Writing Effective Prompts

### Basic Structure

```
Create a [type] app that:
- [Feature 1]
- [Feature 2]
- [Feature 3]
- Use [styling preferences]
```

### Advanced Examples

**Weather Dashboard**
```
App Name: Weather Dashboard
Description: Create a weather app with:
- Input field for city name
- Display current temperature, condition, humidity, wind speed
- Show a 5-day forecast
- Use weather icons (you can use emojis: ☀️ 🌧️ ⛈️ ❄️)
- Beautiful gradient background that changes based on weather
- Use purple and blue color scheme
```

**Budget Tracker**
```
App Name: Budget Tracker
Description: Create a budget tracking app with:
- Add income and expense entries
- Each entry has amount, category, and description
- Display total income, total expenses, and balance
- Show a visual breakdown by category
- Filter entries by category
- Use green for income, red for expenses
- Modern card-based layout
```

**Pomodoro Timer**
```
App Name: Pomodoro Timer
Description: Create a productivity timer with:
- 25-minute work sessions, 5-minute breaks
- Large circular progress indicator
- Start, pause, and reset buttons
- Counter showing completed sessions
- Sound notification when timer completes (you can use alert or console.log)
- Toggle between work and break modes
- Purple gradient theme
```

---

## 🔧 Advanced Features

### API Calls in Generated Apps

Your apps CAN make API calls! Example prompt:

```
App Name: Random Dog Images
Description: Create an app that:
- Fetches random dog images from https://dog.ceo/api/breeds/image/random
- Has a "Get New Dog" button
- Displays the image in a nice card
- Shows a loading state while fetching
- Handles errors gracefully
- Use the fetch API
```

The AI will generate code like:
```javascript
const [image, setImage] = useState('');
const [loading, setLoading] = useState(false);

const fetchDog = async () => {
  setLoading(true);
  try {
    const response = await fetch('https://dog.ceo/api/breeds/image/random');
    const data = await response.json();
    setImage(data.message);
  } catch (error) {
    console.error('Error:', error);
  }
  setLoading(false);
};
```

### Local Storage

Apps can persist data:

```
App Name: Notes App
Description: Create a notes app that:
- Add, edit, and delete notes
- Save notes to localStorage automatically
- Load saved notes on startup
- Each note has a title and content
- Use cards for each note
```

### Complex State Management

```
App Name: Shopping Cart
Description: Create a shopping cart with:
- Product list with name, price, and image URL
- Add to cart button for each product
- Cart sidebar showing added items
- Quantity controls (increase/decrease)
- Total price calculation
- Remove item from cart
- Empty cart button
```

---

## 🎨 Styling Tips

The system uses Tailwind CSS. Tell the AI your preferences:

```
Design requirements:
- Use purple (#9333ea) as primary color
- Rounded corners (rounded-xl)
- Smooth shadows
- Gradient backgrounds
- Hover animations
- Modern, clean design
- Responsive layout
```

---

## 🐛 Troubleshooting

### "Component not found"
- The AI should name the component with a capital letter
- Loader checks: Component, Calculator, TodoList, etc.
- If it fails, the component might not be properly defined

### "Component contains JSX syntax"
- The AI generated JSX instead of React.createElement
- Click regenerate and try again
- The AI prompt specifically requests React.createElement

### App Generation Failed
- Check your API key in `.env.local`
- Ensure you have internet connection
- Check if you have API credits remaining
- Try a simpler prompt first

### Component Renders Blank
- Check browser console for errors
- Click "View Code" to inspect generated code
- The component might have a runtime error

---

## 📊 Database Structure

All apps are stored as entities:

```javascript
{
  entity_type: 'app',
  data: {
    name: 'Calculator',
    description: 'A calculator with basic operations',
    prompt: 'Create a calculator...',
    code: 'const Calculator = () => { ... }',
    componentType: 'tool',
    status: 'active',
    executions: 5,
    version: 1
  }
}
```

---

## 🔐 Security Notes

**Current Implementation (Development Only):**
- Components execute using `Function()` constructor
- No sandboxing - full access to browser APIs
- Safe for personal use and development

**For Production:**
- Implement iframe sandboxing
- Use Web Workers for isolation
- Add code review/approval flow
- Implement rate limiting
- Add user authentication
- Content Security Policy (CSP)

---

## 📈 Performance

- **Generation Time**: 10-30 seconds
- **Database**: SQLite with auto-indexing
- **Caching**: Built-in for entity queries
- **Execution**: Instant (no compilation needed)

---

## 🎯 Example Apps to Generate

Try these prompts:

1. **Stopwatch** - Start, stop, lap times
2. **Color Picker** - RGB/HEX converter with preview
3. **Unit Converter** - Temperature, length, weight
4. **Markdown Previewer** - Side-by-side editor
5. **Password Generator** - Custom length and options
6. **Tip Calculator** - Bill amount, tip %, split
7. **BMI Calculator** - Height, weight input
8. **Dice Roller** - Multiple dice, animation
9. **Quiz App** - Questions, score tracking
10. **Memory Game** - Card matching game

---

## 🚀 Next Steps

1. **Add your API key** to `.env.local`
2. **Generate your first app** - try the Counter example
3. **Experiment** with different prompts
4. **Build complex apps** with API calls and state
5. **Share** your favorite generated apps!

---

## 📚 Additional Resources

- **AI_APPLETS_GUIDE.md** - Detailed AI features
- **README.md** - Entity manager documentation
- **SETUP.md** - Installation guide
- **QUICKSTART.md** - Quick start guide

---

## 🎨 UI/UX Features

- Beautiful gradient cards
- Smooth animations
- Responsive design
- Dark mode support (via theme provider)
- Error boundaries for safety
- Code viewing
- Execution tracking
- Search and filter

---

Built with ❤️ using:
- Claude 4.5 Sonnet (AI)
- Next.js 15 (Framework)
- SQLite (Database)
- Tailwind CSS (Styling)
- Zustand (State Management)
- shadcn/ui (Components)

🎉 **You now have a complete AI application generator!** 🎉
