import type {
  Entry,
  Echo,
  Constellation,
  GlyphEvolution,
  ReflectionPayload,
  MemorySurfaceResponse,
  ConstellationResponse,
  ConstellationFilters,
  GlyphStatsResponse,
  GlyphSuggestion
} from '../types/laani-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ReflectorCodexAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Health and Info
  async getHealth() {
    return this.request('/health');
  }

  async getInfo() {
    return this.request('/');
  }

  // Journal Entries
  async getEntries(params: {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
    glyphs?: string[];
    mood?: string;
    from_date?: string;
    to_date?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return this.request<{
      entries: Entry[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/entries?${searchParams}`);
  }

  async createEntry(entry: {
    content: string;
    privacy_level?: 'private' | 'mirror' | 'collective' | 'public';
    references?: string[];
  }): Promise<{
    entry: Entry;
    reflection: {
      echoes: Echo[];
      processed_at: string;
    };
  }> {
    return this.request('/api/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async getEntry(id: string): Promise<{ entry: Entry }> {
    return this.request(`/api/entries/${id}`);
  }

  async updateEntry(id: string, updates: {
    content?: string;
    privacy_level?: 'private' | 'mirror' | 'collective' | 'public';
    references?: string[];
  }): Promise<{
    entry: Entry;
    reflection?: {
      echoes: Echo[];
      reprocessed: boolean;
    };
  }> {
    return this.request(`/api/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteEntry(id: string): Promise<{
    message: string;
    deleted_at: string;
  }> {
    return this.request(`/api/entries/${id}`, {
      method: 'DELETE',
    });
  }

  async surfaceMemories(triggers: Record<string, any> = {}): Promise<MemorySurfaceResponse> {
    const searchParams = new URLSearchParams();
    if (Object.keys(triggers).length > 0) {
      searchParams.append('triggers', JSON.stringify(triggers));
    }

    return this.request(`/api/entries/resurface?${searchParams}`);
  }

  async generateReflection(entryId: string, prompt?: string): Promise<{
    reflection: ReflectionPayload['reflection'];
    entry_id: string;
    reflected_at: string;
  }> {
    return this.request(`/api/entries/${entryId}/reflect`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  // Constellations
  async getConstellations(filters: Partial<ConstellationFilters> = {}): Promise<ConstellationResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return this.request(`/api/constellations?${searchParams}`);
  }

  async getThemes(timeframe: string = '30d'): Promise<{
    themes: {
      dominant_glyphs: Array<{
        glyph: string;
        usage_frequency: number;
        meaning_evolution: any[];
      }>;
      mood_patterns: any;
      temporal_rhythms: any;
      emerging_symbols: any[];
    };
    analysis_period: string;
    analyzed_at: string;
  }> {
    return this.request(`/api/constellations/themes?timeframe=${timeframe}`);
  }

  // Glyphs
  async getGlyphs(params: {
    sort?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    glyph_filter?: string;
  } = {}): Promise<GlyphStatsResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    return this.request(`/api/glyphs?${searchParams}`);
  }

  async evolveGlyph(data: {
    glyph: string;
    context: string;
    user_meaning?: string;
    evolution_trigger?: 'manual' | 'ai_inference' | 'pattern_recognition' | 'emotional_resonance';
  }): Promise<{
    glyph_evolution: GlyphEvolution;
    new_meaning: any;
    evolution_depth: number;
    evolved_at: string;
  }> {
    return this.request('/api/glyphs/evolve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGlyphEvolution(glyph: string): Promise<{
    glyph_evolution: GlyphEvolution;
    related_entries: Entry[];
    usage_timeline: any[];
    meaning_progression: any;
  }> {
    return this.request(`/api/glyphs/${encodeURIComponent(glyph)}`);
  }

  async refineGlyphMeaning(glyph: string, data: {
    meaning: string;
    context?: string;
    confidence?: number;
  }): Promise<{
    glyph_evolution: GlyphEvolution;
    refined_meaning: any;
    evolution_depth: number;
    refined_at: string;
  }> {
    return this.request(`/api/glyphs/${encodeURIComponent(glyph)}/meaning`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async suggestGlyphs(content: string): Promise<{
    suggestions: GlyphSuggestion[];
    user_glyph_context: any[];
    suggested_at: string;
  }> {
    return this.request('/api/glyphs/suggest', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
}

// Export singleton instance
export const reflectorAPI = new ReflectorCodexAPI();

// Export class for custom instances
export { ReflectorCodexAPI };

// Utility functions for common operations
export const apiUtils = {
  // Format date for API calls
  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },

  // Calculate reading time from word count
  getReadingTime: (wordCount: number): number => {
    return Math.ceil(wordCount / 200); // 200 WPM average
  },

  // Format resonance score for display
  formatResonanceScore: (score: number): string => {
    return (score * 100).toFixed(1) + '%';
  },

  // Get relative time string
  getRelativeTime: (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  },

  // Parse glyph meaning from evolution array
  getLatestGlyphMeaning: (glyphEvolution: GlyphEvolution): string => {
    if (!glyphEvolution.meaning_evolution.length) return 'No meaning recorded';
    return glyphEvolution.meaning_evolution[glyphEvolution.meaning_evolution.length - 1].meaning;
  },

  // Get dominant geometry shape from tone
  getDominantGeometry: (tone: any): string => {
    return tone?.sacred_geometry?.primary_shape || 'circle';
  },

  // Calculate constellation visual positioning
  getConstellationPosition: (constellation: Constellation, containerSize: { width: number; height: number }) => {
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    
    // Scale coordinates to container
    const scale = Math.min(containerSize.width, containerSize.height) / 400;
    
    return {
      x: centerX + (constellation.visual_coordinates.x * scale),
      y: centerY + (constellation.visual_coordinates.y * scale),
      z: constellation.visual_coordinates.z
    };
  }
};
