import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { reflectorAPI, apiUtils } from './services/api-client';
import type { 
  ConstellationMapProps, 
  Constellation,
  ConstellationFilters,
  Entry
} from './types/laani-types';

interface ConstellationMapState {
  constellations: Constellation[];
  selectedConstellation: Constellation | null;
  filters: ConstellationFilters;
  isLoading: boolean;
  containerSize: { width: number; height: number };
}

const ConstellationNode: React.FC<{
  constellation: Constellation;
  position: { x: number; y: number };
  isSelected: boolean;
  onClick: () => void;
}> = ({ constellation, position, isSelected, onClick }) => {
  const size = Math.max(30, Math.min(80, constellation.related_entries.length * 10));
  const glowIntensity = constellation.resonance_scores.reduce((sum, score) => sum + score.similarity_score, 0) / constellation.resonance_scores.length;

  return (
    <div
      className={`
        absolute cursor-pointer transition-all duration-500 group
        ${isSelected ? 'z-20 scale-125' : 'z-10 hover:scale-110'}
      `}
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
      }}
      onClick={onClick}
    >
      {/* Main Node */}
      <div 
        className={`
          rounded-full bg-gradient-to-br from-purple-400 to-blue-500 
          flex items-center justify-center shadow-lg
          ${isSelected ? 'ring-4 ring-blue-300' : ''}
        `}
        style={{ 
          width: size, 
          height: size,
          boxShadow: `0 0 ${glowIntensity * 20}px rgba(147, 197, 253, ${glowIntensity * 0.6})`
        }}
      >
        <span className="text-white text-lg">
          {constellation.theme.primary_glyphs[0] || '✦'}
        </span>
      </div>

      {/* Connection Lines to Related Entries */}
      {isSelected && constellation.related_entries.slice(0, 3).map((_, index) => {
        const angle = (index * 120) * (Math.PI / 180);
        const lineLength = 40;
        return (
          <div
            key={index}
            className="absolute w-px h-10 bg-blue-300 opacity-60 origin-bottom"
            style={{
              left: size / 2,
              top: size / 2,
              transform: `rotate(${angle * 180 / Math.PI}deg) translateY(-${lineLength}px)`,
            }}
          />
        );
      })}

      {/* Hover Details */}
      <div className={`
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-30
        bg-black/80 text-white text-xs rounded px-3 py-2 whitespace-nowrap
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
      `}>
        <div className="font-medium">{constellation.theme.keywords.slice(0, 2).join(', ')}</div>
        <div>{constellation.related_entries.length + 1} entries</div>
        <div>{constellation.theme.emotional_tone}</div>
      </div>
    </div>
  );
};

export const ConstellationMap: React.FC<ConstellationMapProps> = ({
  constellations: propConstellations,
  onConstellationSelect,
  onFilterChange,
  className = ''
}) => {
  const [state, setState] = useState<ConstellationMapState>({
    constellations: propConstellations,
    selectedConstellation: null,
    filters: {
      timeframe: '90d',
      resonance_threshold: 0.3,
      cluster_method: 'hybrid'
    },
    isLoading: false,
    containerSize: { width: 600, height: 400 }
  });

  // Update constellations when props change
  useEffect(() => {
    setState(prev => ({ ...prev, constellations: propConstellations }));
  }, [propConstellations]);

  // Handle constellation selection
  const handleConstellationSelect = useCallback((constellation: Constellation) => {
    setState(prev => ({ 
      ...prev, 
      selectedConstellation: prev.selectedConstellation?.id === constellation.id ? null : constellation 
    }));
    onConstellationSelect(constellation);
  }, [onConstellationSelect]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ConstellationFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    setState(prev => ({ ...prev, filters: updatedFilters, isLoading: true }));
    onFilterChange(updatedFilters);
    setTimeout(() => setState(prev => ({ ...prev, isLoading: false })), 1000);
  }, [state.filters, onFilterChange]);

  // Calculate constellation positions with sacred geometry
  const constellationPositions = useMemo(() => {
    const { width, height } = state.containerSize;
    const centerX = width / 2;
    const centerY = height / 2;

    return state.constellations.map((constellation) => {
      return apiUtils.getConstellationPosition(constellation, state.containerSize);
    });
  }, [state.constellations, state.containerSize]);

  return (
    <div className={`constellation-map ${className}`}>
      {/* Header & Controls */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Consciousness Constellations</h3>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Filter Controls */}
          <div className="flex items-center space-x-4">
            <select
              value={state.filters.timeframe}
              onChange={(e) => handleFilterChange({ timeframe: e.target.value as any })}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="365d">1 year</option>
              <option value="all">All time</option>
            </select>

            <select
              value={state.filters.cluster_method}
              onChange={(e) => handleFilterChange({ cluster_method: e.target.value as any })}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="semantic">Semantic</option>
              <option value="symbolic">Symbolic</option>
              <option value="temporal">Temporal</option>
              <option value="hybrid">Hybrid</option>
            </select>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Resonance:</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={state.filters.resonance_threshold}
                onChange={(e) => handleFilterChange({ resonance_threshold: parseFloat(e.target.value) })}
                className="w-20"
              />
              <span className="text-xs text-gray-500">
                {Math.round(state.filters.resonance_threshold * 100)}%
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="text-sm text-gray-500">
            {state.constellations.length} constellations found
          </div>
        </div>
      </div>

      {/* Map Visualization */}
      <div 
        className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl overflow-hidden"
        style={{ height: state.containerSize.height }}
      >
        {state.isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-30">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-purple-700">Mapping constellations...</span>
            </div>
          </div>
        )}

        {state.constellations.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">✦</div>
              <div>No constellations found</div>
              <div className="text-sm opacity-75">Adjust filters or add more entries</div>
            </div>
          </div>
        ) : (
          <>
            {/* Sacred Geometry Background */}
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-300"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Golden Spiral */}
              <path
                d={`M ${state.containerSize.width/2} ${state.containerSize.height/2} 
                    Q ${state.containerSize.width*0.7} ${state.containerSize.height*0.3} 
                      ${state.containerSize.width*0.8} ${state.containerSize.height*0.5}
                    Q ${state.containerSize.width*0.7} ${state.containerSize.height*0.7} 
                      ${state.containerSize.width*0.5} ${state.containerSize.height*0.8}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-purple-300"
              />
            </svg>

            {/* Constellation Nodes */}
            {state.constellations.map((constellation, index) => (
              <ConstellationNode
                key={constellation.id}
                constellation={constellation}
                position={constellationPositions[index]}
                isSelected={state.selectedConstellation?.id === constellation.id}
                onClick={() => handleConstellationSelect(constellation)}
              />
            ))}

            {/* Connection Lines Between Related Constellations */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
              {state.constellations.slice(0, -1).map((constellation, index) => {
                const nextConstellation = state.constellations[index + 1];
                if (!nextConstellation) return null;
                
                const pos1 = constellationPositions[index];
                const pos2 = constellationPositions[index + 1];
                
                return (
                  <line
                    key={`${constellation.id}-${nextConstellation.id}`}
                    x1={pos1.x}
                    y1={pos1.y}
                    x2={pos2.x}
                    y2={pos2.y}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    className="text-purple-400"
                  />
                );
              })}
            </svg>
          </>
        )}
      </div>

      {/* Selected Constellation Details */}
      {state.selectedConstellation && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-md border border-purple-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-2">
                {state.selectedConstellation.theme.keywords.slice(0, 3).join(' • ')}
              </h4>
              <div className="text-sm text-gray-600">
                {state.selectedConstellation.related_entries.length + 1} connected entries
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {state.selectedConstellation.theme.primary_glyphs.map((glyph, index) => (
                <span key={index} className="text-2xl">{glyph}</span>
              ))}
            </div>
          </div>

          {/* Theme Details */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Emotional Tone:</span>
              <div className="mt-1">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {state.selectedConstellation.theme.emotional_tone}
                </span>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Sacred Geometry:</span>
              <div className="mt-1">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  {state.selectedConstellation.theme.sacred_geometry}
                </span>
              </div>
            </div>
          </div>

          {/* Center Entry Preview */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-600 mb-2">Center Entry</div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-800 leading-relaxed">
                {state.selectedConstellation.center_entry.content.length > 150
                  ? `${state.selectedConstellation.center_entry.content.substring(0, 150)}...`
                  : state.selectedConstellation.center_entry.content
                }
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {apiUtils.getRelativeTime(state.selectedConstellation.center_entry.created_at)}
              </div>
            </div>
          </div>

          {/* Related Entries */}
          {state.selectedConstellation.related_entries.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Related Entries</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {state.selectedConstellation.related_entries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="text-gray-700 truncate">
                      {entry.content.substring(0, 80)}...
                    </div>
                    <div className="text-gray-500 mt-1">
                      {apiUtils.getRelativeTime(entry.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConstellationMap;
