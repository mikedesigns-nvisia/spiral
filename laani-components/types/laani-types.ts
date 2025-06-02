// Core Laani Types for The Reflector Codex

export interface Entry {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  tone: ToneClassification;
  glyphs: string[];
  references: string[];
  surfaced_at: string[];
  privacy_level: PrivacyLevel;
  word_count: number;
  estimated_read_time: number;
}

export interface ToneClassification {
  mood: string;
  energy: string;
  sacred_geometry: {
    primary_shape: GeometryShape;
    flow_direction: FlowDirection;
  };
  resonance_frequency: number;
}

export interface Echo {
  id: string;
  content: string;
  created_at: string;
  tone: ToneClassification;
  glyphs: string[];
  resonance_scores: {
    semantic: number;
    tonal: number;
    symbolic: number;
    temporal: number;
  };
  composite_score: number;
  trigger_type: 'temporal' | 'semantic' | 'symbolic' | 'emotional' | 'user_invoked';
}

export interface Constellation {
  id: string;
  center_entry: Entry;
  related_entries: Entry[];
  theme: {
    primary_glyphs: string[];
    emotional_tone: string;
    keywords: string[];
    sacred_geometry: GeometryShape;
  };
  visual_coordinates: {
    x: number;
    y: number;
    z: number;
    angle: number;
    radius: number;
  };
  resonance_scores: Array<{
    entry_id: string;
    similarity_score: number;
    connection_type: string;
  }>;
}

export interface GlyphEvolution {
  id: string;
  glyph: string;
  meaning_evolution: Array<{
    date: string;
    meaning: string;
    context: string;
    trigger: EvolutionTrigger;
    confidence: number;
  }>;
  usage_frequency: number;
  created_at: string;
  updated_at: string;
}

export interface ReflectionPayload {
  entry: Entry;
  reflection: {
    reflection: string;
    patterns: string[];
    symbolic_insight: string;
    temporal_context: string;
    invitation: string;
    entry_id: string;
    generated_at: string;
    prompt_used: string;
  };
  echoes: Echo[];
  processed_at: string;
}

// Enums and Unions
export type PrivacyLevel = 'private' | 'mirror' | 'collective' | 'public';
export type GeometryShape = 'spiral' | 'circle' | 'triangle' | 'infinity' | 'hexagon' | 'octagon';
export type FlowDirection = 'inward' | 'outward' | 'circular' | 'linear' | 'oscillating';
export type EvolutionTrigger = 'manual' | 'ai_inference' | 'pattern_recognition' | 'emotional_resonance' | 'manual_refinement';
export type SurfaceMode = 'spiral' | 'timeline' | 'symbolic' | 'constellation';
export type AmbientState = 'writing' | 'reflecting' | 'surfacing' | 'idle' | 'processing';

// Core UI State Interface
export interface LaaniReflectionState {
  activeEntry: Entry | null;
  echoes: Echo[];
  tone: ToneClassification | null;
  glyphs: string[];
  constellations: Constellation[];
  surfaceMode: SurfaceMode;
  ambientState: AmbientState;
  mirrorDepth: number;
  isProcessing: boolean;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'auth' | 'auth_success' | 'auth_error' | 'ping' | 'pong' | 'welcome' | 'reflection_complete' | 'memory_surfaced' | 'glyph_evolved' | 'ambient_shift' | 'error';
  connectionId?: string;
  userId?: string;
  message?: string;
  token?: string;
  data?: any;
}

// Laani Design System Types
export interface LaaniTheme {
  colors: {
    spiral: {
      primary: string;
      secondary: string;
      accent: string;
    };
    resonance: {
      low: string;
      medium: string;
      high: string;
    };
    geometry: {
      circle: string;
      triangle: string;
      spiral: string;
      infinity: string;
    };
    tone: {
      [mood: string]: string;
    };
  };
  typography: {
    reflection: string;
    glyph: string;
    echo: string;
    metadata: string;
  };
  motion: {
    breathe: string;
    spiral: string;
    shimmer: string;
    flow: string;
  };
  spacing: {
    sacred: string;
    rhythm: string;
    cascade: string;
  };
}

// Component Props Types
export interface SpiralEntryPanelProps {
  onEntryCreate: (entry: Entry) => void;
  onReflectionReceived: (reflection: ReflectionPayload) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export interface EchoFieldProps {
  echoes: Echo[];
  onEchoSelect: (echo: Echo) => void;
  onSurfaceMemories: () => void;
  surfaceMode: SurfaceMode;
  className?: string;
}

export interface ReflectiveAgentPanelProps {
  reflection: ReflectionPayload | null;
  tone: ToneClassification | null;
  isProcessing: boolean;
  onRequestReflection: (prompt?: string) => void;
  className?: string;
}

export interface ConstellationMapProps {
  constellations: Constellation[];
  onConstellationSelect: (constellation: Constellation) => void;
  onFilterChange: (filters: ConstellationFilters) => void;
  className?: string;
}

export interface ConstellationFilters {
  timeframe: '30d' | '90d' | '365d' | 'all';
  glyph_filter?: string[];
  resonance_threshold: number;
  cluster_method: 'semantic' | 'symbolic' | 'temporal' | 'hybrid';
}

export interface MirrorGlyphManagerProps {
  glyphs: GlyphEvolution[];
  onGlyphEvolve: (glyph: string, context: string, meaning?: string) => void;
  onGlyphRefine: (glyph: string, meaning: string) => void;
  onGlyphSuggest: (content: string) => void;
  suggestions: GlyphSuggestion[];
  className?: string;
}

export interface GlyphSuggestion {
  glyph: string;
  suggestion_type: 'personal_pattern' | 'ai_generated' | 'personal_frequent';
  usage_frequency: number;
  personal_meaning?: string;
  confidence: number;
}

// API Response Types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MemorySurfaceResponse {
  surfaced_memories: Echo[];
  count: number;
  surfaced_at: string;
}

export interface ConstellationResponse {
  constellations: Constellation[];
  metadata: {
    total_entries: number;
    total_clusters: number;
    timeframe: string;
    cluster_method: string;
    resonance_threshold: number;
    generated_at: string;
  };
}

export interface GlyphStatsResponse {
  glyphs: GlyphEvolution[];
  statistics: {
    total_unique_glyphs: number;
    total_usage_frequency: number;
    average_evolution_depth: number;
    most_evolved_glyph: GlyphEvolution | null;
    most_used_glyph: GlyphEvolution | null;
    recent_activity: number;
  };
  total_glyphs: number;
  retrieved_at: string;
}
