# Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# AIML API Configuration
AIML_API_KEY=your_actual_api_key_here
AIML_BASE_URL=https://api.aimlapi.com/v1
```

**To get your API key:**
1. Visit [https://aimlapi.com](https://aimlapi.com)
2. Sign up for an account
3. Navigate to API Keys section
4. Copy your API key
5. Replace `your_actual_api_key_here` in `.env.local` with your key

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

## Quick Test

1. Open [http://localhost:3000](http://localhost:3000)
2. Click on "AI Applets" (purple gradient card)
3. Click "Create App"
4. Try this test prompt:

**App Name**: Simple Counter

**Description**:
```
Create a counter app with:
- A number display starting at 0
- An increment button (+1)
- A decrement button (-1)
- A reset button
- Use purple as the primary color
```

5. Click "Generate App" and wait 10-30 seconds
6. Your app should appear as a card
7. Click "Run App" to test it

## Troubleshooting

### API Key Issues

**Error: "AIML_API_KEY is not configured"**
- Solution: Make sure you created `.env.local` in the project root
- Verify the file contains `AIML_API_KEY=your_key_here`
- Restart the dev server after creating the file

**Error: "400 status code" or "Authentication failed"**
- Solution: Your API key is invalid
- Get a new key from [https://aimlapi.com](https://aimlapi.com)
- Make sure there are no extra spaces in your `.env.local` file

### Database Issues

**Error: "SQLITE_ERROR: no such table"**
- Solution: Delete `data.db` file and restart the server
- The database will be automatically recreated

### Build Issues

**Error during npm install**
- Solution: Try deleting `node_modules` and `package-lock.json`
- Run `npm install` again

**Error: "Module not found"**
- Solution: Make sure all dependencies are installed
- Run `npm install` again

## File Structure

```
/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── apps/         # AI app generation endpoints
│   │   └── entities/     # Entity CRUD endpoints
│   ├── applets/          # AI Applets pages
│   ├── entities/         # Entity management pages
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── ui/               # UI components (shadcn)
│   └── theme-provider.tsx
├── lib/                   # Utilities and core logic
│   ├── ai-client.ts      # Claude AI integration
│   ├── database.ts       # SQLite setup
│   ├── entity-manager.ts # Entity management
│   └── utils.ts          # Helper functions
├── store/                 # State management
│   └── entity-store.ts   # Zustand store
├── .env.local            # Environment variables (you create this)
├── .env.local.example    # Example env file
├── data.db               # SQLite database (auto-created)
├── package.json          # Dependencies
└── README.md             # Documentation
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `AIML_API_KEY` | Yes | Your AIML API key | - |
| `AIML_BASE_URL` | No | API base URL | `https://api.aimlapi.com/v1` |

## Database

The app uses SQLite for storage. The database file is created automatically at:
```
/Users/carlduncan/generative-application/data.db
```

You can inspect it using any SQLite browser tool like:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [TablePlus](https://tableplus.com/)
- VS Code SQLite extension

## Features Overview

### 1. AI Applets
- Generate complete apps from text prompts
- Save and manage generated apps
- Run apps in isolated views
- View source code

### 2. Entity Manager
- Schema-flexible data storage
- CRUD operations for any entity type
- Auto-indexing
- Caching
- Full-text search

### 3. Pre-built Pages
- Users management
- Products catalog
- Orders tracking
- Analytics dashboard

## Next Steps

1. ✅ Complete setup
2. 📖 Read [AI_APPLETS_GUIDE.md](./AI_APPLETS_GUIDE.md) for detailed AI features
3. 📖 Read [README.md](./README.md) for entity manager details
4. 🚀 Start building!

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check the terminal output for specific errors
4. Ensure your API key is valid and has credits

## Security Note

⚠️ **Important**: Never commit your `.env.local` file to version control. It's already in `.gitignore`.
