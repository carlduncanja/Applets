# AI-OS

An AI-powered operating system that creates and runs fully functional applets from natural language. Built with Claude 4.5 Sonnet, Next.js, SQLite, and Tailwind CSS.

Create complete applications, manage data, and interact with your applets - all through natural conversation. No code required.

## Features

- **Zero Schema Migrations**: Add new entity types without database changes
- **Type Safety**: Runtime validation and transformation
- **Auto-Indexing**: Automatically creates indexes for frequently queried fields
- **Built-in Caching**: Performance-optimized with TTL-based caching
- **Full CRUD Operations**: Complete API for managing entities
- **Advanced Queries**: Support for operators ($gt, $gte, $lt, $lte, $ne, $in, $like)
- **Soft Deletes**: Recoverable deletions
- **Aggregations**: sum, avg, min, max, count
- **Full-Text Search**: Search across all entity data
- **Transaction Support**: ACID-compliant transactions
- **Beautiful UI**: Built with shadcn/ui and Tailwind CSS

## Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Register a Schema (Optional but Recommended)

```typescript
import { useEntityStore } from '@/store/entity-store'

const { registerSchema } = useEntityStore()

await registerSchema({
  type: 'user',
  fields: {
    email: {
      type: 'string',
      required: true,
      indexed: true,
      unique: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    age: {
      type: 'number',
      validate: (val) => val >= 0 && val <= 150
    }
  }
})
```

### Create Entities

```typescript
const { createEntity } = useEntityStore()

await createEntity('user', {
  email: 'john@example.com',
  name: 'John Doe',
  age: 30
})
```

### Query Entities

```typescript
const { findEntities } = useEntityStore()

// Find all users
const users = await findEntities('user')

// Find with filters
const adults = await findEntities('user', {
  age: { $gte: 18 }
})

// Find with pagination
const results = await findEntities('user', {}, {
  limit: 10,
  offset: 0,
  orderBy: 'created_at',
  orderDirection: 'DESC'
})
```

### Update Entities

```typescript
const { updateEntity } = useEntityStore()

await updateEntity(id, {
  age: 31,
  email: 'newemail@example.com'
})
```

### Delete Entities

```typescript
const { deleteEntity } = useEntityStore()

// Soft delete (recoverable)
await deleteEntity(id, true)

// Hard delete
await deleteEntity(id, false)
```

### Search Entities

```typescript
const { searchEntities } = useEntityStore()

const results = await searchEntities('user', 'john')
```

### Aggregations

```typescript
const { aggregateEntities } = useEntityStore()

const avgAge = await aggregateEntities('user', 'age', 'avg')
const totalUsers = await aggregateEntities('user', 'id', 'count')
```

## API Routes

All CRUD operations are available via API routes:

- `POST /api/entities` - Create entity
- `POST /api/entities/batch` - Create multiple entities
- `GET /api/entities/find-by-id` - Find by ID
- `POST /api/entities/find` - Find with filters
- `POST /api/entities/count` - Count entities
- `PUT /api/entities/update` - Update entity
- `PUT /api/entities/update-many` - Update multiple
- `PUT /api/entities/replace` - Replace entity data
- `DELETE /api/entities/delete` - Delete entity
- `DELETE /api/entities/delete-many` - Delete multiple
- `PUT /api/entities/restore` - Restore deleted entity
- `POST /api/entities/search` - Full-text search
- `POST /api/entities/aggregate` - Aggregations
- `POST /api/entities/schema` - Register schema
- `GET /api/entities/cache` - Get cache stats
- `DELETE /api/entities/cache` - Clear cache

## Architecture

### Entity Manager
The core `EntityManager` class handles all database operations with automatic optimizations:
- Schema validation
- Auto-indexing
- Caching layer
- Query tracking
- Transaction support

### Zustand Store
Single store pattern for state management:
- Centralized entity state
- Automatic cache synchronization
- Error handling
- Loading states

### SQLite Database
Optimized SQLite configuration:
- WAL mode for concurrency
- JSON field indexing
- Dynamic index creation
- Efficient query patterns

## Project Structure

```
/app
  /api/entities      # API routes
  /entities          # Entity management pages
  globals.css        # Global styles
  layout.tsx         # Root layout
  page.tsx           # Home page
/components
  /ui                # UI components (shadcn)
/lib
  database.ts        # Database initialization
  entity-manager.ts  # Core entity manager
  utils.ts           # Utilities
/store
  entity-store.ts    # Zustand store
```

## Performance

- **Caching**: Configurable TTL-based caching
- **Indexing**: Automatic index creation for hot queries
- **Connection Pooling**: Efficient database connections
- **Batch Operations**: Transactional batch inserts/updates
- **Query Optimization**: Tracks query patterns and optimizes

## License

MIT
# PWA Scripts
generate-icons: node scripts/generate-pwa-icons.js
