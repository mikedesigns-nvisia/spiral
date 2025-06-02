import React, { useState, useEffect, useCallback } from 'react';
import { reflectorAPI, apiUtils } from './services/api-client';
import { reflectorWS } from './services/ws-client';
import type { 
  ReflectiveAgentPanelProps, 
  ReflectionPayload,
  ToneClassification,
  AmbientState,
  GeometryShape
} from './types/laani-types';

interface ReflectiveAgentState {
  currentReflection: ReflectionPayload | null;
  isProcessing: boolean;
  ambientState: AmbientState;
  lastProcessedEntryId: string | null;
  reflectionHistory: ReflectionPayload[];
}

const GeometryVisualization: React.FC<{ 
  shape: GeometryShape; 
  tone: ToneClassification;
  isActive: boolean;
}> = ({ shape, tone, isActive }) => {
  const getShapeColor = () => {
    const mood = tone.mood || 'neutral';
    switch (mood) {
      case 'joyful': return 'text-yellow-400';
      case 'contemplative': return 'text-blue-400';
      case 'melancholic': return 'text-purple-400';
      case 'hopeful': return 'text-green-400';
      case 'peaceful': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const size = isActive ? 64 : 48;
  const animationClass = isActive ? 'animate-pulse' : '';

  switch (shape) {
    case 'spiral':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          className={`${getShapeColor()} ${animationClass} transition-all duration-1000`}
        >
          <path
            d="M12 2 Q16 6 16 12 Q16 18 12 22 Q8 18 8 12 Q8 6 12 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="animate-spin"
            style={{ animationDuration: '15s' }}
          />
        </svg>
      );
    case 'triangle':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          className={`${getShapeColor()} ${animationClass}`}
        >
          <path 
            d="M12 2 L20 20 L4 20 Z" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
          />
        </svg>
      );
    case 'infinity':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          className={`${getShapeColor()} ${animationClass}`}
        >
          <path
            d="M8 12 Q4 8 8 8 Q12 8 12 12 Q12 16 16 16 Q20 16 16 12 Q12 8 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case 'hexagon':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          className={`${getShapeColor()} ${animationClass}`}
        >
          <path
            d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    default: // circle
      return (
        <div 
          className={`rounded-full border-2 ${getShapeColor().replace('text-', 'border-')} ${animationClass}`}
          style={{ width: size, height: size }}
        />
      );
  }
};

export const ReflectiveAgentPanel: React.FC<ReflectiveAgentPanelProps> = ({
  reflection,
  tone,
  isProcessing,
  onRequestReflection,
  className = ''
}) => {
  const [state, setState] = useState<ReflectiveAgentState>({
    currentReflection: reflection,
    isProcessing,
    ambientState: 'idle',
    lastProcessedEntryId: null,
    reflectionHistory: []
  });

  // Update state when props change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentReflection: reflection,
      isProcessing,
      ambientState: isProcessing ? 'processing' : reflection ? 'reflecting' : 'idle'
    }));

    // Add to history if new reflection
    if (reflection && reflection.entry.id !== state.lastProcessedEntryId) {
      setState(prev => ({
        ...prev,
        lastProcessedEntryId: reflection.entry.id,
        reflectionHistory: [reflection, ...prev.reflectionHistory.slice(0, 4)] // Keep last 5
      }));
    }
  }, [reflection, isProcessing, state.lastProcessedEntryId]);

  // WebSocket listeners for real-time reflection updates
  useEffect(() => {
    const handleReflectionComplete = (data: any) => {
      setState(prev => ({ 
        ...prev, 
        ambientState: 'reflecting',
        isProcessing: false
      }));
      
      // Reset to idle after viewing
      setTimeout(() => {
        setState(prev => ({ ...prev, ambientState: 'idle' }));
      }, 5000);
    };

    reflectorWS.on('reflectionComplete', handleReflectionComplete);

    return () => {
      reflectorWS.off('reflectionComplete', handleReflectionComplete);
    };
  }, []);

  // Request new reflection
  const handleRequestReflection = useCallback((customPrompt?: string) => {
    setState(prev => ({ ...prev, isProcessing: true, ambientState: 'processing' }));
    onRequestReflection(customPrompt);
  }, [onRequestReflection]);

  // Get ambient container styles
  const getAmbientStyles = () => {
    const baseClasses = 'transition-all duration-1000 ease-in-out';
    
    switch (state.ambientState) {
      case 'processing':
        return `${baseClasses} bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg ring-2 ring-purple-200`;
      case 'reflecting':
        return `${baseClasses} bg-gradient-to-br from-green-50 to-blue-50 shadow-md ring-2 ring-green-200`;
      default:
        return `${baseClasses} bg-white/95 backdrop-blur-sm`;
    }
  };

  const currentGeometry = tone?.sacred_geometry?.primary_shape || 'circle';
  const resonanceLevel = tone?.resonance_frequency || 0;

  return (
    <div className={`reflective-agent-panel ${className}`}>
      <div className={`rounded-2xl p-6 shadow-xl ${getAmbientStyles()}`}>
        
        {/* Header with Sacred Geometry */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <GeometryVisualization 
              shape={currentGeometry}
              tone={tone || { 
                mood: 'neutral', 
                energy: 'balanced',
                sacred_geometry: { primary_shape: 'circle', flow_direction: 'circular' },
                resonance_frequency: 0.5
              }}
              isActive={state.ambientState === 'processing' || state.ambientState === 'reflecting'}
            />
            <div>
              <h3 className="text-lg font-medium text-gray-800">Reflective Intelligence</h3>
              <div className="text-sm text-gray-500">
                {state.ambientState === 'processing' && 'Weaving consciousness patterns...'}
                {state.ambientState === 'reflecting' && 'Reflection received'}
                {state.ambientState === 'idle' && 'Ready to reflect'}
              </div>
            </div>
          </div>

          {/* Tone Indicators */}
          {tone && (
            <div className="flex flex-col items-end space-y-1">
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {tone.mood}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  {tone.energy}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Resonance: {Math.round(resonanceLevel * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Processing State */}
        {state.isProcessing && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-purple-700 font-medium">AI consciousness processing...</span>
            </div>
            <div className="mt-2 text-sm text-purple-600">
              Analyzing patterns, extracting symbols, generating insights
            </div>
          </div>
        )}

        {/* Current Reflection */}
        {state.currentReflection && !state.isProcessing && (
          <div className="mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
              
              {/* Reflection Content */}
              <div className="prose prose-sm text-gray-800 mb-4 leading-relaxed">
                {state.currentReflection.reflection.reflection}
              </div>

              {/* Symbolic Insight */}
              {state.currentReflection.reflection.symbolic_insight && (
                <div className="mb-4 p-3 bg-white/60 rounded-lg">
                  <div className="text-xs font-medium text-gray-600 mb-1">Symbolic Resonance</div>
                  <div className="text-sm text-gray-700 italic">
                    {state.currentReflection.reflection.symbolic_insight}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {state.currentReflection.reflection.patterns && state.currentReflection.reflection.patterns.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-600 mb-2">Emerging Patterns</div>
                  <div className="flex flex-wrap gap-1">
                    {state.currentReflection.reflection.patterns.map((pattern, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Temporal Context */}
              {state.currentReflection.reflection.temporal_context && (
                <div className="mb-4 text-xs text-gray-600">
                  <span className="font-medium">Temporal Context:</span> {state.currentReflection.reflection.temporal_context}
                </div>
              )}

              {/* Invitation */}
              {state.currentReflection.reflection.invitation && (
                <div className="p-3 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border border-green-200">
                  <div className="text-xs font-medium text-green-700 mb-1">Invitation for Deeper Exploration</div>
                  <div className="text-sm text-green-800">
                    {state.currentReflection.reflection.invitation}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Generated {apiUtils.getRelativeTime(state.currentReflection.reflection.generated_at)}
                </span>
                <span>
                  {state.currentReflection.echoes.length} echoes surfaced
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Reflections: {state.reflectionHistory.length}</span>
            {tone && (
              <span>•</span>
            )}
            {tone && (
              <span>{currentGeometry} geometry</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Custom Reflection Prompt */}
            <button
              onClick={() => {
                const customPrompt = prompt('Enter a custom reflection prompt (optional):');
                if (customPrompt !== null) {
                  handleRequestReflection(customPrompt || undefined);
                }
              }}
              disabled={state.isProcessing}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Custom Prompt
            </button>
            
            {/* Generate Reflection */}
            <button
              onClick={() => handleRequestReflection()}
              disabled={state.isProcessing}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all
                ${state.isProcessing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-md hover:shadow-lg'
                }
              `}
            >
              {state.isProcessing ? 'Reflecting...' : 'Generate Reflection'}
            </button>
          </div>
        </div>

        {/* Reflection History Preview */}
        {state.reflectionHistory.length > 0 && !state.currentReflection && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-600 mb-2">Recent Reflections</div>
            <div className="space-y-2">
              {state.reflectionHistory.slice(0, 2).map((reflection, index) => (
                <div 
                  key={reflection.entry.id}
                  className="p-2 bg-gray-50 rounded text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setState(prev => ({ ...prev, currentReflection: reflection }))}
                >
                  <div className="truncate">
                    {reflection.reflection.reflection.substring(0, 100)}...
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {apiUtils.getRelativeTime(reflection.reflection.generated_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReflectiveAgentPanel;
