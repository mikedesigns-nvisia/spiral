// Laani Components for The Reflector Codex
// A complete React component library for consciousness-aware journaling

// Main Components
export { default as SpiralEntryPanel } from './SpiralEntryPanel';
export { default as EchoField } from './EchoField';
export { default as ReflectiveAgentPanel } from './ReflectiveAgentPanel';
export { default as ConstellationMap } from './ConstellationMap';
export { default as MirrorGlyphManager } from './MirrorGlyphManager';

// Services
export { reflectorAPI, ReflectorCodexAPI, apiUtils } from './services/api-client';
export { 
  reflectorWS, 
  ReflectorWebSocketClient,
  useReflectorWebSocket,
  useReflectionUpdates,
  useMemorySurfacing,
  useGlyphEvolution,
  useAmbientState
} from './services/ws-client';

// Types
export type {
  // Core Data Types
  Entry,
  Echo,
  Constellation,
  GlyphEvolution,
  ReflectionPayload,
  ToneClassification,
  
  // Enum Types
  PrivacyLevel,
  GeometryShape,
  FlowDirection,
  EvolutionTrigger,
  SurfaceMode,
  AmbientState,
  
  // State Interfaces
  LaaniReflectionState,
  WebSocketMessage,
  LaaniTheme,
  
  // Component Props
  SpiralEntryPanelProps,
  EchoFieldProps,
  ReflectiveAgentPanelProps,
  ConstellationMapProps,
  ConstellationFilters,
  MirrorGlyphManagerProps,
  GlyphSuggestion,
  
  // API Response Types
  APIResponse,
  PaginatedResponse,
  MemorySurfaceResponse,
  ConstellationResponse,
  GlyphStatsResponse
} from './types/laani-types';

// Component Export Map for Dynamic Imports
export const LaaniComponents = {
  SpiralEntryPanel: () => import('./SpiralEntryPanel'),
  EchoField: () => import('./EchoField'),
  ReflectiveAgentPanel: () => import('./ReflectiveAgentPanel'),
  ConstellationMap: () => import('./ConstellationMap'),
  MirrorGlyphManager: () => import('./MirrorGlyphManager')
} as const;

// Version
export const LAANI_COMPONENTS_VERSION = '1.0.0';

// Default Configuration
export const defaultLaaniConfig = {
  apiBaseURL: 'http://localhost:3001',
  wsBaseURL: 'ws://localhost:3002',
  theme: {
    colors: {
      spiral: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        accent: '#06B6D4'
      },
      resonance: {
        low: '#EF4444',
        medium: '#F59E0B',
        high: '#10B981'
      },
      geometry: {
        circle: '#6B7280',
        triangle: '#DC2626',
        spiral: '#7C3AED',
        infinity: '#059669'
      }
    },
    motion: {
      breathe: 'animate-pulse',
      spiral: 'animate-spin',
      shimmer: 'animate-bounce',
      flow: 'animate-pulse'
    }
  }
};
