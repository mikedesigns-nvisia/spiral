import React, { useState, useEffect, useRef, useCallback } from 'react';
import { reflectorAPI, apiUtils } from './services/api-client';
import { reflectorWS } from './services/ws-client';
import type { 
  SpiralEntryPanelProps, 
  Entry, 
  ToneClassification, 
  GlyphSuggestion,
  AmbientState 
} from './types/laani-types';

interface SpiralEntryPanelState {
  content: string;
  isProcessing: boolean;
  currentTone: ToneClassification | null;
  glyphSuggestions: GlyphSuggestion[];
  ambientState: AmbientState;
  resonanceFrequency: number;
  wordCount: number;
}

export const SpiralEntryPanel: React.FC<SpiralEntryPanelProps> = ({
  onEntryCreate,
  onReflectionReceived,
  className = '',
  placeholder = 'Begin your reflection...',
  autoFocus = true
}) => {
  const [state, setState] = useState<SpiralEntryPanelState>({
    content: '',
    isProcessing: false,
    currentTone: null,
    glyphSuggestions: [],
    ambientState: 'idle',
    resonanceFrequency: 0.5,
    wordCount: 0
  });

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const toneAnalysisTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAnalyzedContent = useRef<string>('');

  // Real-time tone analysis during typing
  const analyzeContentTone = useCallback(async (content: string) => {
    if (content.length < 10 || content === lastAnalyzedContent.current) return;
    
    try {
      lastAnalyzedContent.current = content;
      const suggestions = await reflectorAPI.suggestGlyphs(content);
      
      // Simulate tone analysis (in real implementation, you might want a lightweight tone endpoint)
      const estimatedTone: ToneClassification = {
        mood: content.includes('grateful') || content.includes('joy') ? 'joyful' : 
              content.includes('difficult') || content.includes('challenge') ? 'contemplative' : 'neutral',
        energy: content.length > 100 ? 'expansive' : 'balanced',
        sacred_geometry: {
          primary_shape: 'spiral',
          flow_direction: 'inward'
        },
        resonance_frequency: Math.min(0.9, content.length / 200)
      };

      setState(prev => ({
        ...prev,
        currentTone: estimatedTone,
        glyphSuggestions: suggestions.suggestions,
        resonanceFrequency: estimatedTone.resonance_frequency,
        ambientState: 'writing'
      }));
    } catch (error) {
      console.error('Tone analysis error:', error);
    }
  }, []);

  // Handle content changes with debounced analysis
  const handleContentChange = useCallback((newContent: string) => {
    const wordCount = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    setState(prev => ({
      ...prev,
      content: newContent,
      wordCount,
      ambientState: newContent.length > 0 ? 'writing' : 'idle'
    }));

    // Debounced tone analysis
    if (toneAnalysisTimeout.current) {
      clearTimeout(toneAnalysisTimeout.current);
    }
    
    toneAnalysisTimeout.current = setTimeout(() => {
      analyzeContentTone(newContent);
    }, 500);
  }, [analyzeContentTone]);

  // Submit entry
  const handleSubmit = useCallback(async () => {
    if (!state.content.trim() || state.isProcessing) return;

    setState(prev => ({ ...prev, isProcessing: true, ambientState: 'processing' }));

    try {
      const response = await reflectorAPI.createEntry({
        content: state.content,
        privacy_level: 'mirror'
      });

      // Clear the input
      setState(prev => ({
        ...prev,
        content: '',
        isProcessing: false,
        wordCount: 0,
        currentTone: null,
        glyphSuggestions: [],
        ambientState: 'reflecting'
      }));

      // Notify parent components
      onEntryCreate(response.entry);
      if (response.reflection) {
        onReflectionReceived({
          entry: response.entry,
          reflection: response.reflection as any, // Type assertion for now
          echoes: response.reflection.echoes,
          processed_at: response.reflection.processed_at
        });
      }

      // Focus back to textarea
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }

      // Reset ambient state after reflection
      setTimeout(() => {
        setState(prev => ({ ...prev, ambientState: 'idle' }));
      }, 3000);

    } catch (error) {
      console.error('Entry creation error:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        ambientState: 'idle' 
      }));
    }
  }, [state.content, state.isProcessing, onEntryCreate, onReflectionReceived]);

  // Handle glyph insertion
  const handleGlyphInsert = useCallback((glyph: string) => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = 
      state.content.substring(0, start) + 
      ` ${glyph} ` + 
      state.content.substring(end);

    handleContentChange(newContent);
    
    // Set cursor position after glyph
    setTimeout(() => {
      textarea.setSelectionRange(start + glyph.length + 2, start + glyph.length + 2);
      textarea.focus();
    }, 0);
  }, [state.content, handleContentChange]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [state.content]);

  // WebSocket listeners for ambient feedback
  useEffect(() => {
    const handleReflectionComplete = (data: any) => {
      setState(prev => ({ ...prev, ambientState: 'reflecting' }));
      setTimeout(() => {
        setState(prev => ({ ...prev, ambientState: 'idle' }));
      }, 2000);
    };

    reflectorWS.on('reflectionComplete', handleReflectionComplete);

    return () => {
      reflectorWS.off('reflectionComplete', handleReflectionComplete);
    };
  }, []);

  // Get ambient styles based on current state
  const getAmbientStyles = () => {
    const baseClasses = 'transition-all duration-1000 ease-in-out';
    
    switch (state.ambientState) {
      case 'writing':
        return `${baseClasses} ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/20`;
      case 'processing':
        return `${baseClasses} ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/30 animate-pulse`;
      case 'reflecting':
        return `${baseClasses} ring-2 ring-green-400/40 shadow-lg shadow-green-500/25`;
      default:
        return `${baseClasses} ring-1 ring-gray-300/20`;
    }
  };

  // Get resonance glow intensity
  const getResonanceGlow = () => {
    const intensity = Math.min(100, state.resonanceFrequency * 100);
    return {
      boxShadow: `0 0 ${intensity / 2}px rgba(147, 197, 253, ${intensity / 200})`
    };
  };

  return (
    <div className={`spiral-entry-panel relative ${className}`}>
      {/* Ambient Background Aura */}
      <div 
        className={`absolute inset-0 rounded-2xl ${getAmbientStyles()}`}
        style={getResonanceGlow()}
      />
      
      {/* Main Content Container */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
        
        {/* Sacred Geometry Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-white text-sm">🌀</span>
            </div>
            <div className="text-sm text-gray-600">
              {state.ambientState === 'writing' && 'Weaving reflection...'}
              {state.ambientState === 'processing' && 'Processing with AI...'}
              {state.ambientState === 'reflecting' && 'Reflection complete'}
              {state.ambientState === 'idle' && 'Ready for your thoughts'}
            </div>
          </div>
          
          {/* Tone Indicator */}
          {state.currentTone && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-blue-100 rounded-full">
                {state.currentTone.mood}
              </span>
              <span className="px-2 py-1 bg-green-100 rounded-full">
                {state.currentTone.energy}
              </span>
            </div>
          )}
        </div>

        {/* Main Text Area */}
        <div className="relative">
          <textarea
            ref={textAreaRef}
            value={state.content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={state.isProcessing}
            className={`
              w-full min-h-[120px] max-h-[400px] resize-none
              bg-transparent border-none outline-none
              text-gray-800 text-base leading-relaxed
              placeholder:text-gray-400 placeholder:italic
              ${state.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
          
          {/* Sacred Geometry Accent */}
          {state.resonanceFrequency > 0.3 && (
            <div className="absolute top-2 right-2 opacity-20">
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400">
                <path
                  d="M12 2 L22 12 L12 22 L2 12 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="animate-spin"
                  style={{ animationDuration: '8s' }}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Glyph Suggestions */}
        {state.glyphSuggestions.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-2">Symbolic resonance:</div>
            <div className="flex flex-wrap gap-2">
              {state.glyphSuggestions.slice(0, 8).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleGlyphInsert(suggestion.glyph)}
                  className="px-3 py-1 bg-white rounded-full text-lg hover:bg-blue-50 transition-colors cursor-pointer border border-gray-200 hover:border-blue-300"
                  title={suggestion.personal_meaning || 'AI suggested symbol'}
                >
                  {suggestion.glyph}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{state.wordCount} words</span>
            {state.wordCount > 0 && (
              <span>{apiUtils.getReadingTime(state.wordCount)} min read</span>
            )}
            {state.currentTone && (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse" />
                {Math.round(state.resonanceFrequency * 100)}% resonance
              </span>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!state.content.trim() || state.isProcessing}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all
              ${state.content.trim() && !state.isProcessing
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {state.isProcessing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Reflecting...
              </span>
            ) : (
              'Reflect ⌘↵'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpiralEntryPanel;
