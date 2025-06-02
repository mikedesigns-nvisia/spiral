import React, { useState, useEffect, useCallback } from 'react';
import { reflectorAPI, apiUtils } from './services/api-client';
import { reflectorWS } from './services/ws-client';
import type { 
  MirrorGlyphManagerProps, 
  GlyphEvolution,
  GlyphSuggestion
} from './types/laani-types';

interface MirrorGlyphManagerState {
  glyphs: GlyphEvolution[];
  suggestions: GlyphSuggestion[];
  selectedGlyph: GlyphEvolution | null;
  isLoading: boolean;
  viewMode: 'grid' | 'timeline' | 'evolution';
  filterText: string;
}

const GlyphCard: React.FC<{
  glyph: GlyphEvolution;
  isSelected: boolean;
  onClick: () => void;
  onEvolve: (meaning?: string) => void;
}> = ({ glyph, isSelected, onClick, onEvolve }) => {
  const latestMeaning = apiUtils.getLatestGlyphMeaning(glyph);
  const evolutionDepth = glyph.meaning_evolution.length;
  
  return (
    <div
      className={`
        relative p-4 rounded-lg border transition-all cursor-pointer
        ${isSelected 
          ? 'border-blue-300 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
      onClick={onClick}
    >
      {/* Glyph Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-3xl">{glyph.glyph}</div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Used {glyph.usage_frequency} times</div>
          <div className="text-xs text-gray-500">{evolutionDepth} evolutions</div>
        </div>
      </div>

      {/* Latest Meaning */}
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-700 mb-1">Current Meaning</div>
        <div className="text-sm text-gray-600 leading-relaxed">
          {latestMeaning.length > 80 
            ? `${latestMeaning.substring(0, 80)}...`
            : latestMeaning
          }
        </div>
      </div>

      {/* Evolution Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, evolutionDepth) }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < evolutionDepth ? 'bg-purple-400' : 'bg-gray-200'
              }`}
            />
          ))}
          {evolutionDepth > 5 && (
            <span className="text-xs text-gray-500">+{evolutionDepth - 5}</span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            const meaning = prompt('Enter new meaning for this glyph (optional):');
            if (meaning !== null) {
              onEvolve(meaning || undefined);
            }
          }}
          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
        >
          Evolve
        </button>
      </div>
    </div>
  );
};

const SuggestionCard: React.FC<{
  suggestion: GlyphSuggestion;
  onAccept: () => void;
}> = ({ suggestion, onAccept }) => {
  const getTypeColor = () => {
    switch (suggestion.suggestion_type) {
      case 'personal_pattern': return 'bg-blue-100 text-blue-800';
      case 'personal_frequent': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{suggestion.glyph}</div>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor()}`}>
              {suggestion.suggestion_type.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(suggestion.confidence * 100)}% confidence
            </span>
          </div>
          {suggestion.personal_meaning && (
            <div className="text-xs text-gray-600">
              {suggestion.personal_meaning.length > 60
                ? `${suggestion.personal_meaning.substring(0, 60)}...`
                : suggestion.personal_meaning
              }
            </div>
          )}
          {suggestion.usage_frequency > 0 && (
            <div className="text-xs text-gray-500">
              Used {suggestion.usage_frequency} times before
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={onAccept}
        className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
      >
        Accept
      </button>
    </div>
  );
};

export const MirrorGlyphManager: React.FC<MirrorGlyphManagerProps> = ({
  glyphs: propGlyphs,
  onGlyphEvolve,
  onGlyphRefine,
  onGlyphSuggest,
  suggestions: propSuggestions,
  className = ''
}) => {
  const [state, setState] = useState<MirrorGlyphManagerState>({
    glyphs: propGlyphs,
    suggestions: propSuggestions,
    selectedGlyph: null,
    isLoading: false,
    viewMode: 'grid',
    filterText: ''
  });

  // Update state when props change
  useEffect(() => {
    setState(prev => ({ 
      ...prev, 
      glyphs: propGlyphs,
      suggestions: propSuggestions 
    }));
  }, [propGlyphs, propSuggestions]);

  // Handle glyph selection
  const handleGlyphSelect = useCallback((glyph: GlyphEvolution) => {
    setState(prev => ({ 
      ...prev, 
      selectedGlyph: prev.selectedGlyph?.id === glyph.id ? null : glyph 
    }));
  }, []);

  // Handle glyph evolution
  const handleGlyphEvolve = useCallback((glyph: string, meaning?: string) => {
    onGlyphEvolve(glyph, 'Manual evolution from glyph manager', meaning);
  }, [onGlyphEvolve]);

  // Handle suggestion acceptance
  const handleSuggestionAccept = useCallback((suggestion: GlyphSuggestion) => {
    onGlyphEvolve(
      suggestion.glyph, 
      'Accepted from AI suggestions',
      suggestion.personal_meaning
    );
  }, [onGlyphEvolve]);

  // WebSocket listeners for glyph evolution updates
  useEffect(() => {
    const handleGlyphEvolved = (data: any) => {
      setState(prev => ({ ...prev, isLoading: false }));
      // Could refresh glyph data here
    };

    reflectorWS.on('glyphEvolved', handleGlyphEvolved);

    return () => {
      reflectorWS.off('glyphEvolved', handleGlyphEvolved);
    };
  }, []);

  // Filter glyphs based on search
  const filteredGlyphs = state.glyphs.filter(glyph => {
    if (!state.filterText) return true;
    const searchTerm = state.filterText.toLowerCase();
    return (
      glyph.glyph.includes(searchTerm) ||
      apiUtils.getLatestGlyphMeaning(glyph).toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className={`mirror-glyph-manager ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm">🔮</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800">Glyph Evolution</h3>
            <div className="text-sm text-gray-500">
              {state.glyphs.length} symbols • {state.suggestions.length} suggestions
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          {(['grid', 'timeline', 'evolution'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setState(prev => ({ ...prev, viewMode: mode }))}
              className={`
                px-3 py-1 text-sm rounded-full transition-colors
                ${state.viewMode === mode
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Suggestions */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search glyphs or meanings..."
            value={state.filterText}
            onChange={(e) => setState(prev => ({ ...prev, filterText: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* AI Suggestions */}
        {state.suggestions.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">AI Suggestions</div>
            <div className="space-y-2">
              {state.suggestions.slice(0, 3).map((suggestion, index) => (
                <SuggestionCard
                  key={index}
                  suggestion={suggestion}
                  onAccept={() => handleSuggestionAccept(suggestion)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Glyph Grid */}
      <div className="mb-6">
        {filteredGlyphs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">🔮</div>
            <div>No glyphs found</div>
            <div className="text-sm opacity-75">
              {state.filterText ? 'Try a different search term' : 'Create some journal entries to see glyphs'}
            </div>
          </div>
        ) : (
          <div className={`
            ${state.viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
            }
          `}>
            {filteredGlyphs.map((glyph) => (
              <GlyphCard
                key={glyph.id}
                glyph={glyph}
                isSelected={state.selectedGlyph?.id === glyph.id}
                onClick={() => handleGlyphSelect(glyph)}
                onEvolve={(meaning) => handleGlyphEvolve(glyph.glyph, meaning)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Glyph Details */}
      {state.selectedGlyph && (
        <div className="p-6 bg-white rounded-lg shadow-md border border-purple-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{state.selectedGlyph.glyph}</div>
              <div>
                <h4 className="text-lg font-medium text-gray-800">Evolution History</h4>
                <div className="text-sm text-gray-600">
                  {state.selectedGlyph.usage_frequency} total uses • {state.selectedGlyph.meaning_evolution.length} evolutions
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                const newMeaning = prompt('Refine the meaning of this glyph:');
                if (newMeaning) {
                  onGlyphRefine(state.selectedGlyph!.glyph, newMeaning);
                }
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Refine Meaning
            </button>
          </div>

          {/* Evolution Timeline */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {state.selectedGlyph.meaning_evolution.map((evolution, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-purple-700">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-800 mb-1">{evolution.meaning}</div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{apiUtils.getRelativeTime(evolution.date)}</span>
                    <span>•</span>
                    <span className="px-2 py-1 bg-gray-200 rounded">{evolution.trigger}</span>
                    <span>•</span>
                    <span>{Math.round(evolution.confidence * 100)}% confidence</span>
                  </div>
                  {evolution.context && evolution.context !== 'Manual meaning refinement' && (
                    <div className="text-xs text-gray-600 mt-1 italic">
                      Context: {evolution.context.substring(0, 60)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <div>
          {filteredGlyphs.length} of {state.glyphs.length} glyphs shown
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              const content = prompt('Enter content to get glyph suggestions:');
              if (content) {
                onGlyphSuggest(content);
              }
            }}
            className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Get AI Suggestions
          </button>
          <span>
            Total evolutions: {state.glyphs.reduce((sum, g) => sum + g.meaning_evolution.length, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MirrorGlyphManager;
