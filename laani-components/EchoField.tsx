import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { reflectorAPI, apiUtils } from './services/api-client';
import { reflectorWS } from './services/ws-client';
import type { 
  EchoFieldProps, 
  Echo, 
  SurfaceMode,
  AmbientState 
} from './types/laani-types';

interface EchoFieldState {
  echoes: Echo[];
  isLoading: boolean;
  surfaceMode: SurfaceMode;
  selectedEcho: Echo | null;
  ambientState: AmbientState;
  recentSurfacing: Echo[];
}

interface EchoVisualizationProps {
  echo: Echo;
  position: { x: number; y: number; angle: number };
  isSelected: boolean;
  onClick: () => void;
  surfaceMode: SurfaceMode;
}

const EchoVisualization: React.FC<EchoVisualizationProps> = ({
  echo,
  position,
  isSelected,
  onClick,
  surfaceMode
}) => {
  const resonanceIntensity = echo.composite_score * 100;
  const size = Math.max(20, Math.min(60, resonanceIntensity));
  const opacity = Math.max(0.4, echo.composite_score);

  const getGeometryShape = () => {
    const shape = echo.tone?.sacred_geometry?.primary_shape || 'circle';
    
    switch (shape) {
      case 'spiral':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" style={{ animationDuration: '20s' }}>
            <path
              d="M12 2 Q16 6 16 12 Q16 18 12 22 Q8 18 8 12 Q8 6 12 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        );
      case 'triangle':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M12 2 L20 20 L4 20 Z" fill="currentColor" opacity={opacity} />
          </svg>
        );
      case 'infinity':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M8 12 Q4 8 8 8 Q12 8 12 12 Q12 16 16 16 Q20 16 16 12 Q12 8 8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        );
      default:
        return (
          <div 
            className="rounded-full"
            style={{ 
              width: size, 
              height: size,
              opacity
            }}
          />
        );
    }
  };

  const getMoodColor = () => {
    const mood = echo.tone?.mood || 'neutral';
    switch (mood) {
      case 'joyful': return 'text-yellow-400 bg-yellow-100';
      case 'contemplative': return 'text-blue-400 bg-blue-100';
      case 'melancholic': return 'text-purple-400 bg-purple-100';
      case 'hopeful': return 'text-green-400 bg-green-100';
      case 'peaceful': return 'text-cyan-400 bg-cyan-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  return (
    <div
      className={`
        absolute cursor-pointer transition-all duration-500 group
        ${isSelected ? 'z-20 scale-125' : 'z-10 hover:scale-110'}
      `}
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        transform: surfaceMode === 'spiral' ? `rotate(${position.angle}deg)` : 'none'
      }}
      onClick={onClick}
    >
      {/* Echo Visualization */}
      <div className={`${getMoodColor()} rounded-full flex items-center justify-center shadow-lg`}>
        {getGeometryShape()}
      </div>

      {/* Glyphs Overlay */}
      {echo.glyphs && echo.glyphs.length > 0 && (
        <div className="absolute -top-2 -right-2 text-xs">
          {echo.glyphs[0]}
        </div>
      )}

      {/* Resonance Pulse */}
      <div 
        className={`
          absolute inset-0 rounded-full border-2 animate-ping
          ${isSelected ? 'border-blue-400' : 'border-transparent'}
        `}
        style={{
          animationDuration: `${2 + (1 - echo.composite_score) * 3}s`
        }}
      />

      {/* Hover Details */}
      <div className={`
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
        ${surfaceMode === 'timeline' ? 'z-30' : ''}
      `}>
        <div>{apiUtils.getRelativeTime(echo.created_at)}</div>
        <div>Resonance: {apiUtils.formatResonanceScore(echo.composite_score)}</div>
        <div className="text-xs opacity-75">{echo.trigger_type}</div>
      </div>
    </div>
  );
};

export const EchoField: React.FC<EchoFieldProps> = ({
  echoes: propEchoes,
  onEchoSelect,
  onSurfaceMemories,
  surfaceMode,
  className = ''
}) => {
  const [state, setState] = useState<EchoFieldState>({
    echoes: propEchoes,
    isLoading: false,
    surfaceMode,
    selectedEcho: null,
    ambientState: 'idle',
    recentSurfacing: []
  });

  // Update echoes when props change
  useEffect(() => {
    setState(prev => ({ ...prev, echoes: propEchoes, surfaceMode }));
  }, [propEchoes, surfaceMode]);

  // Handle new memory surfacing
  const handleMemorySurface = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, ambientState: 'surfacing' }));
    
    try {
      await onSurfaceMemories();
      setState(prev => ({ ...prev, ambientState: 'reflecting' }));
      
      // Reset ambient state
      setTimeout(() => {
        setState(prev => ({ ...prev, ambientState: 'idle' }));
      }, 2000);
    } catch (error) {
      console.error('Memory surfacing error:', error);
      setState(prev => ({ ...prev, ambientState: 'idle' }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [onSurfaceMemories]);

  // Handle echo selection
  const handleEchoSelect = useCallback((echo: Echo) => {
    setState(prev => ({ 
      ...prev, 
      selectedEcho: prev.selectedEcho?.id === echo.id ? null : echo 
    }));
    onEchoSelect(echo);
  }, [onEchoSelect]);

  // WebSocket listeners for real-time memory surfacing
  useEffect(() => {
    const handleMemorySurfaced = (data: any) => {
      if (data.surfaced_memories) {
        setState(prev => ({
          ...prev,
          recentSurfacing: data.surfaced_memories,
          ambientState: 'surfacing'
        }));
        
        // Fade out recent surfacing indicator
        setTimeout(() => {
          setState(prev => ({ ...prev, recentSurfacing: [] }));
        }, 5000);
      }
    };

    reflectorWS.on('memorySurfaced', handleMemorySurfaced);

    return () => {
      reflectorWS.off('memorySurfaced', handleMemorySurfaced);
    };
  }, []);

  // Calculate positions for echo visualization
  const echoPositions = useMemo(() => {
    const containerSize = { width: 400, height: 400 };
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;

    return state.echoes.map((echo, index) => {
      switch (state.surfaceMode) {
        case 'spiral':
          // Golden spiral positioning
          const angle = index * 2.39996; // Golden angle
          const radius = Math.sqrt(index + 1) * 20;
          return {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            angle: (angle * 180) / Math.PI
          };
        
        case 'timeline':
          // Linear timeline
          const timelineY = 50 + (index % 3) * 100;
          const timelineX = 50 + (index * 80);
          return {
            x: timelineX,
            y: timelineY,
            angle: 0
          };
        
        case 'symbolic':
          // Cluster by glyphs
          const glyphHash = echo.glyphs?.[0]?.charCodeAt(0) || 0;
          const symbolRadius = 150;
          const symbolAngle = (glyphHash % 12) * (Math.PI / 6);
          return {
            x: centerX + Math.cos(symbolAngle) * symbolRadius,
            y: centerY + Math.sin(symbolAngle) * symbolRadius,
            angle: symbolAngle * 180 / Math.PI
          };
        
        default:
          return { x: centerX, y: centerY, angle: 0 };
      }
    });
  }, [state.echoes, state.surfaceMode]);

  // Get ambient container styles
  const getAmbientStyles = () => {
    const baseClasses = 'transition-all duration-1000 ease-in-out';
    
    switch (state.ambientState) {
      case 'surfacing':
        return `${baseClasses} bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg`;
      case 'reflecting':
        return `${baseClasses} bg-gradient-to-br from-green-50 to-blue-50 shadow-md`;
      default:
        return `${baseClasses} bg-gray-50/50`;
    }
  };

  return (
    <div className={`echo-field relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
            <span className="text-white text-xs">🌊</span>
          </div>
          <h3 className="text-lg font-medium text-gray-800">Memory Echoes</h3>
          {state.recentSurfacing.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full animate-pulse">
              {state.recentSurfacing.length} new
            </span>
          )}
        </div>
        
        <button
          onClick={handleMemorySurface}
          disabled={state.isLoading}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-all
            ${state.isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-purple-500 text-white hover:bg-purple-600 shadow-md hover:shadow-lg'
            }
          `}
        >
          {state.isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Surfacing...
            </span>
          ) : (
            'Surface Memories'
          )}
        </button>
      </div>

      {/* Visualization Container */}
      <div className={`relative w-full h-96 rounded-2xl ${getAmbientStyles()}`}>
        {state.echoes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🌀</div>
              <div>No echoes to display</div>
              <div className="text-sm opacity-75">Surface memories to see reflections</div>
            </div>
          </div>
        ) : (
          <>
            {/* Echo Visualizations */}
            {state.echoes.map((echo, index) => (
              <EchoVisualization
                key={echo.id}
                echo={echo}
                position={echoPositions[index]}
                isSelected={state.selectedEcho?.id === echo.id}
                onClick={() => handleEchoSelect(echo)}
                surfaceMode={state.surfaceMode}
              />
            ))}

            {/* Connection Lines for Spiral Mode */}
            {state.surfaceMode === 'spiral' && state.echoes.length > 1 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                {echoPositions.slice(0, -1).map((pos, index) => {
                  const nextPos = echoPositions[index + 1];
                  return (
                    <line
                      key={index}
                      x1={pos.x}
                      y1={pos.y}
                      x2={nextPos.x}
                      y2={nextPos.y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      className="text-gray-400"
                    />
                  );
                })}
              </svg>
            )}

            {/* Sacred Geometry Overlay */}
            {state.surfaceMode === 'spiral' && (
              <div className="absolute inset-0 pointer-events-none opacity-10">
                <svg className="w-full h-full">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="150"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-purple-400"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-blue-400"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-green-400"
                  />
                </svg>
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Echo Details */}
      {state.selectedEcho && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">
                {apiUtils.getRelativeTime(state.selectedEcho.created_at)}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                {state.selectedEcho.trigger_type}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {apiUtils.formatResonanceScore(state.selectedEcho.composite_score)} resonance
            </div>
          </div>
          
          <div className="text-gray-800 mb-3 leading-relaxed">
            {state.selectedEcho.content.length > 200 
              ? `${state.selectedEcho.content.substring(0, 200)}...`
              : state.selectedEcho.content
            }
          </div>
          
          {/* Glyphs */}
          {state.selectedEcho.glyphs && state.selectedEcho.glyphs.length > 0 && (
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs text-gray-500">Symbols:</span>
              {state.selectedEcho.glyphs.map((glyph, index) => (
                <span key={index} className="text-lg">{glyph}</span>
              ))}
            </div>
          )}
          
          {/* Resonance Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Semantic: {apiUtils.formatResonanceScore(state.selectedEcho.resonance_scores.semantic)}</div>
            <div>Tonal: {apiUtils.formatResonanceScore(state.selectedEcho.resonance_scores.tonal)}</div>
            <div>Symbolic: {apiUtils.formatResonanceScore(state.selectedEcho.resonance_scores.symbolic)}</div>
            <div>Temporal: {apiUtils.formatResonanceScore(state.selectedEcho.resonance_scores.temporal)}</div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div>
          {state.echoes.length} echoes • {state.surfaceMode} view
        </div>
        <div className="flex items-center space-x-4">
          <span>
            Avg resonance: {
              state.echoes.length > 0 
                ? apiUtils.formatResonanceScore(
                    state.echoes.reduce((sum, echo) => sum + echo.composite_score, 0) / state.echoes.length
                  )
                : '0%'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default EchoField;
