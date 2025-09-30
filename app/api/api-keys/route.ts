import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

// GET - Retrieve all API keys (masked)
export async function GET(request: NextRequest) {
  try {
    const em = getEntityManager();
    const keys = em.find('api_key', {});
    
    // Mask the actual keys for security
    const maskedKeys = keys.map(key => ({
      ...key,
      data: {
        ...key.data,
        value: key.data.value ? `${key.data.value.substring(0, 8)}...` : ''
      }
    }));
    
    return NextResponse.json(maskedKeys);
  } catch (error: any) {
    console.error('API keys retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve API keys' },
      { status: 500 }
    );
  }
}

// POST - Add or update an API key
export async function POST(request: NextRequest) {
  try {
    const { name, value, description } = await request.json();
    
    if (!name || !value) {
      return NextResponse.json(
        { error: 'name and value are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    
    // Check if key already exists
    const existing = em.find('api_key', { name });
    
    if (existing.length > 0) {
      // Update existing key
      const updated = em.update(existing[0].id, {
        value,
        description: description || existing[0].data.description,
        updated_at: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        key: {
          ...updated,
          data: {
            ...updated.data,
            value: `${value.substring(0, 8)}...`
          }
        }
      });
    } else {
      // Create new key
      const newKey = em.create('api_key', {
        name,
        value,
        description: description || '',
        created_at: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        key: {
          ...newKey,
          data: {
            ...newKey.data,
            value: `${value.substring(0, 8)}...`
          }
        }
      });
    }
  } catch (error: any) {
    console.error('API key save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save API key' },
      { status: 500 }
    );
  }
}

// DELETE - Remove an API key
export async function DELETE(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    const existing = em.find('api_key', { name });
    
    if (existing.length > 0) {
      em.delete(existing[0].id, true);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

