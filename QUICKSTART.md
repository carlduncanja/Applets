# Quick Start Guide

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## What You'll See

The app will show a dashboard with example entity types:
- **Users** - Manage user entities
- **Products** - Product catalog
- **Orders** - Order management
- **Analytics** - View statistics
- **All Entities** - Browse any entity type

## Creating Your First Entity

### Option 1: Use Pre-built Pages

1. Click on **Users**, **Products**, or **Orders**
2. Click the "New User" (or Product/Order) button
3. Click "Load Template" to see example JSON
4. Edit the JSON data as needed
5. Click "Create Entity"

### Option 2: Use Any Entity Type

1. Click **All Entities**
2. Enter any entity type name (e.g., "blog_post", "customer", "invoice")
3. Click "Load"
4. Click "New" to create your first entity
5. Enter JSON data and save

## Example: Creating a Custom Entity Type

Let's create a "blog_post" entity:

1. Go to **All Entities**
2. Type "blog_post" in the entity type field
3. Click "Load" (you'll see "No entities found")
4. Click "Create First Entity"
5. Enter this JSON:
   ```json
   {
     "title": "My First Post",
     "content": "This is the content of my blog post",
     "author": "John Doe",
     "published": true,
     "tags": ["tech", "tutorial"],
     "views": 0
   }
   ```
6. Click "Create Entity"

That's it! No schema changes, no migrations needed.

## Querying Entities (API Examples)

All entities are accessible via API routes:

### Create Entity
```bash
curl -X POST http://localhost:3000/api/entities \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "blog_post",
    "data": {
      "title": "My Post",
      "content": "Hello World"
    }
  }'
```

### Find Entities
```bash
curl -X POST http://localhost:3000/api/entities/find \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "blog_post",
    "filters": {},
    "options": { "limit": 10 }
  }'
```

### Find with Filters
```bash
curl -X POST http://localhost:3000/api/entities/find \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "blog_post",
    "filters": {
      "published": true,
      "views": { "$gte": 100 }
    }
  }'
```

### Search Entities
```bash
curl -X POST http://localhost:3000/api/entities/search \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "blog_post",
    "searchTerm": "tutorial"
  }'
```

## Using in Your React Components

```typescript
import { useEntityStore } from '@/store/entity-store'

function MyComponent() {
  const { createEntity, findEntities } = useEntityStore()
  
  // Create an entity
  const handleCreate = async () => {
    await createEntity('blog_post', {
      title: 'My Post',
      content: 'Hello World',
      published: true
    })
  }
  
  // Find entities
  const loadPosts = async () => {
    const posts = await findEntities('blog_post', {
      published: true
    })
    console.log(posts)
  }
  
  return (
    <div>
      <button onClick={handleCreate}>Create Post</button>
      <button onClick={loadPosts}>Load Posts</button>
    </div>
  )
}
```

## Registering Schemas (Optional)

For better validation and auto-indexing, register a schema:

```typescript
import { useEntityStore } from '@/store/entity-store'

const { registerSchema } = useEntityStore()

await registerSchema({
  type: 'blog_post',
  fields: {
    title: {
      type: 'string',
      required: true,
      indexed: true
    },
    content: {
      type: 'string',
      required: true
    },
    published: {
      type: 'boolean',
      indexed: true
    },
    views: {
      type: 'number',
      validate: (val) => val >= 0
    },
    tags: {
      type: 'array'
    }
  }
})
```

## Database Location

The SQLite database is stored at:
```
/Users/carlduncan/generative-application/data.db
```

You can inspect it using any SQLite browser tool.

## Key Features

✅ **No Schema Changes** - Add any entity type without migrations
✅ **Type Validation** - Optional schemas for runtime validation
✅ **Auto-Indexing** - Automatically indexes frequently queried fields
✅ **Caching** - Built-in caching with configurable TTL
✅ **Advanced Queries** - Supports $gt, $gte, $lt, $lte, $ne, $in, $like
✅ **Soft Deletes** - Recoverable entity deletion
✅ **Full-Text Search** - Search across all entity data
✅ **Aggregations** - sum, avg, min, max, count
✅ **Transactions** - ACID-compliant transactions

## Next Steps

1. Explore the **Analytics** page to see cache statistics
2. Create different entity types for your use case
3. Use the API routes in your own applications
4. Check out the **README.md** for advanced usage

Enjoy building with the Entity Manager! 🚀
