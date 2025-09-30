import { create } from 'zustand';
import type { EntitySchema, QueryOptions } from '@/lib/entity-manager';

interface Entity {
  id: string;
  entity_type: string;
  data: any;
  metadata: any;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface EntityStoreState {
  entities: Record<string, Entity[]>;
  selectedEntity: Entity | null;
  isLoading: boolean;
  error: string | null;
  schemas: Map<string, EntitySchema>;

  // Schema management
  registerSchema: (schema: EntitySchema) => Promise<void>;

  // CRUD operations
  createEntity: (entityType: string, data: any, metadata?: any) => Promise<Entity>;
  createManyEntities: (entityType: string, records: any[]) => Promise<Entity[]>;
  findEntityById: (id: string, options?: QueryOptions) => Promise<Entity | null>;
  findEntities: (entityType: string, filters?: any, options?: QueryOptions) => Promise<Entity[]>;
  findOneEntity: (entityType: string, filters: any, options?: QueryOptions) => Promise<Entity | null>;
  countEntities: (entityType: string, filters?: any) => Promise<number>;
  existsEntity: (entityType: string, filters: any) => Promise<boolean>;
  updateEntity: (id: string, updates: any) => Promise<Entity | null>;
  updateManyEntities: (entityType: string, filters: any, updates: any) => Promise<number>;
  replaceEntity: (id: string, data: any) => Promise<Entity | null>;
  deleteEntity: (id: string, soft?: boolean) => Promise<boolean>;
  deleteManyEntities: (entityType: string, filters: any, soft?: boolean) => Promise<number>;
  restoreEntity: (id: string) => Promise<boolean>;
  searchEntities: (entityType: string, searchTerm: string, options?: QueryOptions) => Promise<Entity[]>;
  aggregateEntities: (entityType: string, field: string, operation: 'sum' | 'avg' | 'min' | 'max' | 'count') => Promise<number>;

  // Cache management
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<any>;

  // Local state management
  setSelectedEntity: (entity: Entity | null) => void;
  loadEntitiesIntoStore: (entityType: string) => Promise<void>;
  clearError: () => void;
}

export const useEntityStore = create<EntityStoreState>((set, get) => ({
  entities: {},
  selectedEntity: null,
  isLoading: false,
  error: null,
  schemas: new Map(),

  // ============================================
  // SCHEMA MANAGEMENT
  // ============================================

  registerSchema: async (schema: EntitySchema) => {
    try {
      const response = await fetch('/api/entities/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema })
      });

      if (!response.ok) {
        throw new Error('Failed to register schema');
      }

      const schemas = new Map(get().schemas);
      schemas.set(schema.type, schema);
      set({ schemas });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  // ============================================
  // CREATE
  // ============================================

  createEntity: async (entityType: string, data: any, metadata: any = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, data, metadata })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create entity');
      }

      const entity = await response.json();

      // Update local store
      const entities = { ...get().entities };
      if (!entities[entityType]) entities[entityType] = [];
      entities[entityType] = [entity, ...entities[entityType]];
      set({ entities, isLoading: false });

      return entity;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createManyEntities: async (entityType: string, records: any[]) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, records })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create entities');
      }

      const entities = await response.json();

      // Update local store
      const entitiesMap = { ...get().entities };
      if (!entitiesMap[entityType]) entitiesMap[entityType] = [];
      entitiesMap[entityType] = [...entities, ...entitiesMap[entityType]];
      set({ entities: entitiesMap, isLoading: false });

      return entities;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================
  // READ
  // ============================================

  findEntityById: async (id: string, options: QueryOptions = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({ id, ...options as any });
      const response = await fetch(`/api/entities/find-by-id?${queryParams}`);

      if (!response.ok) {
        throw new Error('Entity not found');
      }

      const entity = await response.json();
      set({ isLoading: false });
      return entity;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  findEntities: async (entityType: string, filters: any = {}, options: QueryOptions = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filters, options })
      });

      if (!response.ok) {
        throw new Error('Failed to find entities');
      }

      const entities = await response.json();
      set({ isLoading: false });
      return entities;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  findOneEntity: async (entityType: string, filters: any, options: QueryOptions = {}) => {
    const entities = await get().findEntities(entityType, filters, { ...options, limit: 1 });
    return entities.length > 0 ? entities[0] : null;
  },

  countEntities: async (entityType: string, filters: any = {}) => {
    try {
      const response = await fetch('/api/entities/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filters })
      });

      if (!response.ok) {
        throw new Error('Failed to count entities');
      }

      const { count } = await response.json();
      return count;
    } catch (error: any) {
      set({ error: error.message });
      return 0;
    }
  },

  existsEntity: async (entityType: string, filters: any) => {
    const count = await get().countEntities(entityType, filters);
    return count > 0;
  },

  // ============================================
  // UPDATE
  // ============================================

  updateEntity: async (id: string, updates: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update entity');
      }

      const entity = await response.json();

      // Update local store
      const entities = { ...get().entities };
      if (entities[entity.entity_type]) {
        const index = entities[entity.entity_type].findIndex(e => e.id === id);
        if (index !== -1) {
          entities[entity.entity_type][index] = entity;
        }
      }
      set({ entities, isLoading: false });

      return entity;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateManyEntities: async (entityType: string, filters: any, updates: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/update-many', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filters, updates })
      });

      if (!response.ok) {
        throw new Error('Failed to update entities');
      }

      const { count } = await response.json();
      set({ isLoading: false });

      // Reload entities in store
      await get().loadEntitiesIntoStore(entityType);

      return count;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return 0;
    }
  },

  replaceEntity: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/replace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, data })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to replace entity');
      }

      const entity = await response.json();

      // Update local store
      const entities = { ...get().entities };
      if (entities[entity.entity_type]) {
        const index = entities[entity.entity_type].findIndex(e => e.id === id);
        if (index !== -1) {
          entities[entity.entity_type][index] = entity;
        }
      }
      set({ entities, isLoading: false });

      return entity;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // ============================================
  // DELETE
  // ============================================

  deleteEntity: async (id: string, soft: boolean = true) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, soft })
      });

      if (!response.ok) {
        throw new Error('Failed to delete entity');
      }

      const { success, entityType } = await response.json();

      // Update local store
      if (success && entityType) {
        const entities = { ...get().entities };
        if (entities[entityType]) {
          entities[entityType] = entities[entityType].filter(e => e.id !== id);
        }
        set({ entities });
      }

      set({ isLoading: false });
      return success;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteManyEntities: async (entityType: string, filters: any, soft: boolean = true) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/delete-many', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filters, soft })
      });

      if (!response.ok) {
        throw new Error('Failed to delete entities');
      }

      const { count } = await response.json();
      set({ isLoading: false });

      // Reload entities in store
      await get().loadEntitiesIntoStore(entityType);

      return count;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return 0;
    }
  },

  restoreEntity: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/restore', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        throw new Error('Failed to restore entity');
      }

      const { success } = await response.json();
      set({ isLoading: false });
      return success;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // ============================================
  // ADVANCED QUERIES
  // ============================================

  searchEntities: async (entityType: string, searchTerm: string, options: QueryOptions = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/entities/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, searchTerm, options })
      });

      if (!response.ok) {
        throw new Error('Failed to search entities');
      }

      const entities = await response.json();
      set({ isLoading: false });
      return entities;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  aggregateEntities: async (entityType: string, field: string, operation: 'sum' | 'avg' | 'min' | 'max' | 'count') => {
    try {
      const response = await fetch('/api/entities/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, field, operation })
      });

      if (!response.ok) {
        throw new Error('Failed to aggregate entities');
      }

      const { result } = await response.json();
      return result;
    } catch (error: any) {
      set({ error: error.message });
      return 0;
    }
  },

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  clearCache: async () => {
    try {
      await fetch('/api/entities/cache', {
        method: 'DELETE'
      });
    } catch (error: any) {
      console.error('Failed to clear cache:', error);
    }
  },

  getCacheStats: async () => {
    try {
      const response = await fetch('/api/entities/cache');
      if (response.ok) {
        return await response.json();
      }
    } catch (error: any) {
      console.error('Failed to get cache stats:', error);
    }
    return null;
  },

  // ============================================
  // LOCAL STATE MANAGEMENT
  // ============================================

  setSelectedEntity: (entity: Entity | null) => {
    set({ selectedEntity: entity });
  },

  loadEntitiesIntoStore: async (entityType: string) => {
    const entities = await get().findEntities(entityType);
    const entitiesMap = { ...get().entities };
    entitiesMap[entityType] = entities;
    set({ entities: entitiesMap });
  },

  clearError: () => {
    set({ error: null });
  }
}));
