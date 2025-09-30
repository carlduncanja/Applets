import { NextRequest, NextResponse } from 'next/server';
import { getEntityManager } from '@/lib/entity-manager';

export async function POST(request: NextRequest) {
  try {
    const { action, entityType, data, filters, updates, entityId } = await request.json();
    
    if (!action || !entityType) {
      return NextResponse.json(
        { error: 'action and entityType are required' },
        { status: 400 }
      );
    }

    const em = getEntityManager();
    let result: any;
    let message = '';

    switch (action) {
      case 'create':
        if (!data) {
          return NextResponse.json({ error: 'data is required for create' }, { status: 400 });
        }
        result = em.create(entityType, data);
        message = `Created ${entityType}`;
        break;

      case 'update':
        if (!entityId || !updates) {
          return NextResponse.json({ error: 'entityId and updates are required' }, { status: 400 });
        }
        result = em.update(entityId, updates);
        message = `Updated ${entityType}`;
        break;

      case 'delete':
        if (!entityId) {
          return NextResponse.json({ error: 'entityId is required for delete' }, { status: 400 });
        }
        result = em.delete(entityId, true);
        message = `Deleted ${entityType}`;
        break;

      case 'find':
        result = em.find(entityType, filters || {}, { limit: 100 });
        message = `Found ${result.length} ${entityType}(s)`;
        break;

      case 'toggle':
        if (!entityId) {
          return NextResponse.json({ error: 'entityId is required for toggle' }, { status: 400 });
        }
        const entity = em.findById(entityId);
        if (entity) {
          const currentValue = entity.data.completed || entity.data.checked || false;
          result = em.update(entityId, { 
            completed: !currentValue,
            checked: !currentValue
          });
          message = `Toggled ${entityType}`;
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result,
      message
    });
  } catch (error: any) {
    console.error('Data action error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute data action' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
