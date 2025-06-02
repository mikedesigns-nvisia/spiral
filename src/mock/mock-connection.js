// Mock database connection for running without Supabase
import { 
  MOCK_ENTRIES, 
  MOCK_GLYPH_EVOLUTIONS, 
  MOCK_CONSTELLATIONS, 
  MOCK_ECHOES,
  mockUser 
} from './mock-data.js';

class MockSupabaseClient {
  constructor() {
    // In-memory storage for mock mode
    this.data = {
      users: [mockUser],
      entries: [...MOCK_ENTRIES],
      glyph_evolutions: [...MOCK_GLYPH_EVOLUTIONS],
      constellations: [...MOCK_CONSTELLATIONS],
      echoes: [...MOCK_ECHOES]
    };
  }

  from(table) {
    return new MockQueryBuilder(this.data, table);
  }
}

class MockQueryBuilder {
  constructor(data, table) {
    this.data = data;
    this.table = table;
    this.query = {
      select: '*',
      filters: [],
      orderBy: null,
      limit: null,
      single: false
    };
  }

  select(columns = '*') {
    this.query.select = columns;
    return this;
  }

  insert(data) {
    // Add to mock data
    if (Array.isArray(data)) {
      this.data[this.table].push(...data);
    } else {
      this.data[this.table].push(data);
    }
    
    return {
      select: () => ({
        single: () => Promise.resolve({ 
          data: Array.isArray(data) ? data[0] : data, 
          error: null 
        })
      })
    };
  }

  eq(column, value) {
    this.query.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this.query.filters.push({ type: 'neq', column, value });
    return this;
  }

  order(column, options = {}) {
    this.query.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  single() {
    this.query.single = true;
    return this;
  }

  delete() {
    // Mock delete - just return success
    return Promise.resolve({ data: null, error: null });
  }

  async then(resolve) {
    const result = await this.execute();
    return resolve(result);
  }

  async execute() {
    let results = [...this.data[this.table]];

    // Apply filters
    for (const filter of this.query.filters) {
      if (filter.type === 'eq') {
        results = results.filter(item => item[filter.column] === filter.value);
      } else if (filter.type === 'neq') {
        results = results.filter(item => item[filter.column] !== filter.value);
      }
    }

    // Apply ordering
    if (this.query.orderBy) {
      const { column, ascending } = this.query.orderBy;
      results.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        if (ascending) {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    // Apply limit
    if (this.query.limit) {
      results = results.slice(0, this.query.limit);
    }

    // Return single item or array
    if (this.query.single) {
      return {
        data: results.length > 0 ? results[0] : null,
        error: results.length === 0 ? { message: 'No rows found' } : null
      };
    }

    return {
      data: results,
      error: null
    };
  }
}

// Export mock clients
export const supabase = new MockSupabaseClient();
export const supabaseAdmin = new MockSupabaseClient();

console.log('🎭 Running in MOCK MODE - Using simulated data instead of Supabase');
