import express from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../database/connection.js';
import { authenticateUser, rateLimitByOperation } from '../middleware/auth.js';
import ReflectiveAgent from '../services/ReflectiveAgent.js';

const router = express.Router();
const reflectiveAgent = new ReflectiveAgent();

// Validation schemas
const evolveGlyphSchema = z.object({
  glyph: z.string().min(1).max(10),
  context: z.string().min(1).max(500),
  user_meaning: z.string().optional(),
  evolution_trigger: z.enum(['manual', 'ai_inference', 'pattern_recognition', 'emotional_resonance']).default('manual')
});

const updateGlyphMeaningSchema = z.object({
  meaning: z.string().min(1).max(200),
  context: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1.0)
});

/**
 * POST /api/glyphs/evolve
 * Track and evolve symbolic meaning of glyphs over time
 */
router.post('/evolve',
  authenticateUser,
  rateLimitByOperation('glyph_evolution'),
  async (req, res) => {
    try {
      // Validate request body
      const validationResult = evolveGlyphSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid glyph evolution data',
          details: validationResult.error.errors
        });
      }

      const { glyph, context, user_meaning, evolution_trigger } = validationResult.data;

      console.log(`🔮 Evolving glyph ${glyph} for user ${req.user.id}`);

      // Check if glyph evolution record exists
      const { data: existingGlyph, error: fetchError } = await supabase
        .from('glyph_evolutions')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('glyph', glyph)
        .single();

      let glyphRecord;

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create new glyph evolution record
        const { data: newGlyph, error: insertError } = await supabase
          .from('glyph_evolutions')
          .insert({
            user_id: req.user.id,
            glyph,
            meaning_evolution: [],
            usage_frequency: 1
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating glyph evolution:', insertError);
          return res.status(500).json({
            error: 'Database error',
            message: 'Failed to create glyph evolution record'
          });
        }

        glyphRecord = newGlyph;
      } else if (fetchError) {
        console.error('Error fetching glyph evolution:', fetchError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch glyph evolution'
        });
      } else {
        glyphRecord = existingGlyph;
      }

      // Generate AI-inferred meaning if not provided by user
      let inferredMeaning = user_meaning;
      if (!user_meaning && evolution_trigger === 'ai_inference') {
        try {
          inferredMeaning = await generateGlyphMeaning(glyph, context);
        } catch (aiError) {
          console.error('AI meaning generation failed:', aiError);
          inferredMeaning = `Symbol used in context: ${context.substring(0, 50)}...`;
        }
      }

      // Add new evolution entry
      const evolutionEntry = {
        date: new Date().toISOString(),
        meaning: inferredMeaning || `Used in: ${context.substring(0, 50)}...`,
        context: context,
        trigger: evolution_trigger,
        confidence: user_meaning ? 1.0 : 0.7
      };

      const updatedEvolution = [...(glyphRecord.meaning_evolution || []), evolutionEntry];

      // Update glyph evolution record
      const { data: updatedGlyph, error: updateError } = await supabaseAdmin
        .from('glyph_evolutions')
        .update({
          meaning_evolution: updatedEvolution,
          usage_frequency: glyphRecord.usage_frequency + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', glyphRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating glyph evolution:', updateError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to update glyph evolution'
        });
      }

      res.json({
        glyph_evolution: updatedGlyph,
        new_meaning: evolutionEntry,
        evolution_depth: updatedEvolution.length,
        evolved_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Glyph evolution error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to evolve glyph meaning'
      });
    }
  }
);

/**
 * GET /api/glyphs
 * Get user's glyph evolution history
 */
router.get('/',
  authenticateUser,
  async (req, res) => {
    try {
      const {
        sort = 'usage_frequency',
        order = 'desc',
        limit = 50,
        glyph_filter
      } = req.query;

      let query = supabase
        .from('glyph_evolutions')
        .select('*')
        .eq('user_id', req.user.id);

      if (glyph_filter) {
        query = query.eq('glyph', glyph_filter);
      }

      query = query
        .order(sort, { ascending: order === 'asc' })
        .limit(parseInt(limit));

      const { data: glyphs, error } = await query;

      if (error) {
        console.error('Error fetching glyph evolutions:', error);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch glyph evolutions'
        });
      }

      // Calculate evolution statistics
      const stats = calculateGlyphStats(glyphs || []);

      res.json({
        glyphs: glyphs || [],
        statistics: stats,
        total_glyphs: glyphs?.length || 0,
        retrieved_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get glyphs error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to retrieve glyph evolutions'
      });
    }
  }
);

/**
 * GET /api/glyphs/:glyph
 * Get specific glyph evolution history
 */
router.get('/:glyph',
  authenticateUser,
  async (req, res) => {
    try {
      const { glyph } = req.params;

      const { data: glyphEvolution, error } = await supabase
        .from('glyph_evolutions')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('glyph', glyph)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Glyph not found',
            message: 'This glyph has no evolution history'
          });
        }
        
        console.error('Error fetching glyph evolution:', error);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch glyph evolution'
        });
      }

      // Find entries that use this glyph
      const { data: relatedEntries, error: entriesError } = await supabase
        .from('entries')
        .select('id, content, created_at, tone')
        .eq('user_id', req.user.id)
        .contains('glyphs', [glyph])
        .order('created_at', { ascending: false })
        .limit(20);

      if (entriesError) {
        console.error('Error fetching related entries:', entriesError);
      }

      res.json({
        glyph_evolution: glyphEvolution,
        related_entries: relatedEntries || [],
        usage_timeline: generateUsageTimeline(glyphEvolution, relatedEntries || []),
        meaning_progression: analyzeMeaningProgression(glyphEvolution.meaning_evolution || [])
      });

    } catch (error) {
      console.error('Get glyph evolution error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to retrieve glyph evolution'
      });
    }
  }
);

/**
 * PUT /api/glyphs/:glyph/meaning
 * Update or refine glyph meaning
 */
router.put('/:glyph/meaning',
  authenticateUser,
  rateLimitByOperation('update_glyph_meaning'),
  async (req, res) => {
    try {
      const { glyph } = req.params;

      // Validate request body
      const validationResult = updateGlyphMeaningSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid meaning update data',
          details: validationResult.error.errors
        });
      }

      const { meaning, context, confidence } = validationResult.data;

      // Get existing glyph evolution
      const { data: glyphEvolution, error: fetchError } = await supabase
        .from('glyph_evolutions')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('glyph', glyph)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Glyph not found',
            message: 'This glyph has no evolution history'
          });
        }
        
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch glyph evolution'
        });
      }

      // Add refined meaning to evolution
      const refinementEntry = {
        date: new Date().toISOString(),
        meaning: meaning,
        context: context || 'Manual meaning refinement',
        trigger: 'manual_refinement',
        confidence: confidence
      };

      const updatedEvolution = [...(glyphEvolution.meaning_evolution || []), refinementEntry];

      // Update glyph evolution
      const { data: updatedGlyph, error: updateError } = await supabaseAdmin
        .from('glyph_evolutions')
        .update({
          meaning_evolution: updatedEvolution,
          updated_at: new Date().toISOString()
        })
        .eq('id', glyphEvolution.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating glyph meaning:', updateError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to update glyph meaning'
        });
      }

      res.json({
        glyph_evolution: updatedGlyph,
        refined_meaning: refinementEntry,
        evolution_depth: updatedEvolution.length,
        refined_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update glyph meaning error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to update glyph meaning'
      });
    }
  }
);

/**
 * GET /api/glyphs/suggest/:content
 * Suggest glyphs for given content using AI
 */
router.post('/suggest',
  authenticateUser,
  rateLimitByOperation('glyph_suggestion'),
  async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || content.length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Content is required for glyph suggestion'
        });
      }

      console.log(`🔮 Suggesting glyphs for user ${req.user.id}`);

      // Get user's existing glyphs for personalization
      const { data: userGlyphs } = await supabase
        .from('glyph_evolutions')
        .select('glyph, usage_frequency, meaning_evolution')
        .eq('user_id', req.user.id)
        .order('usage_frequency', { ascending: false })
        .limit(20);

      // Generate AI suggestions
      const suggestions = await reflectiveAgent.extractGlyphs(content);
      
      // Enhance suggestions with user's glyph history
      const enhancedSuggestions = enhanceGlyphSuggestions(
        suggestions,
        userGlyphs || [],
        content
      );

      res.json({
        suggestions: enhancedSuggestions,
        user_glyph_context: userGlyphs?.slice(0, 10) || [],
        suggested_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Glyph suggestion error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to suggest glyphs'
      });
    }
  }
);

/**
 * Generate AI-inferred meaning for a glyph in context
 */
async function generateGlyphMeaning(glyph, context) {
  const prompt = `Given the symbolic glyph "${glyph}" used in this context: "${context}"

What archetypal or personal meaning might this symbol hold? Consider:
- Emotional themes and resonance
- Natural or elemental associations  
- Transformational or cyclical patterns
- Universal symbolic meanings
- Personal significance in this specific context

Respond with a brief, insightful meaning (1-2 sentences) that captures the essence of this symbol's usage.`;

  try {
    const response = await reflectiveAgent.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a symbolic intelligence that perceives archetypal meanings in glyphs and emojis. Provide brief, insightful interpretations that honor both universal and personal significance.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 100
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Glyph meaning generation error:', error);
    return `Symbolic presence in context of ${context.substring(0, 30)}...`;
  }
}

/**
 * Calculate glyph usage statistics
 */
function calculateGlyphStats(glyphs) {
  const stats = {
    total_unique_glyphs: glyphs.length,
    total_usage_frequency: glyphs.reduce((sum, g) => sum + g.usage_frequency, 0),
    average_evolution_depth: 0,
    most_evolved_glyph: null,
    most_used_glyph: null,
    recent_activity: 0
  };

  if (glyphs.length > 0) {
    // Calculate average evolution depth
    const totalDepth = glyphs.reduce((sum, g) => sum + (g.meaning_evolution?.length || 0), 0);
    stats.average_evolution_depth = totalDepth / glyphs.length;

    // Find most evolved glyph
    stats.most_evolved_glyph = glyphs.reduce((max, g) => 
      (g.meaning_evolution?.length || 0) > (max.meaning_evolution?.length || 0) ? g : max
    );

    // Find most used glyph
    stats.most_used_glyph = glyphs.reduce((max, g) => 
      g.usage_frequency > max.usage_frequency ? g : max
    );

    // Calculate recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    stats.recent_activity = glyphs.filter(g => 
      new Date(g.updated_at) > weekAgo
    ).length;
  }

  return stats;
}

/**
 * Generate usage timeline for a glyph
 */
function generateUsageTimeline(glyphEvolution, relatedEntries) {
  const timeline = [];

  // Add evolution events
  (glyphEvolution.meaning_evolution || []).forEach(evolution => {
    timeline.push({
      date: evolution.date,
      type: 'meaning_evolution',
      event: `Meaning evolved: ${evolution.meaning}`,
      trigger: evolution.trigger,
      confidence: evolution.confidence
    });
  });

  // Add usage events from entries
  relatedEntries.forEach(entry => {
    timeline.push({
      date: entry.created_at,
      type: 'usage',
      event: `Used in journal entry`,
      entry_id: entry.id,
      context: entry.content.substring(0, 100) + '...'
    });
  });

  // Sort by date
  return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Analyze meaning progression over time
 */
function analyzeMeaningProgression(meaningEvolution) {
  if (!meaningEvolution || meaningEvolution.length === 0) {
    return { progression_type: 'none', stages: [] };
  }

  const progression = {
    progression_type: 'evolving',
    stages: meaningEvolution.map((evolution, index) => ({
      stage: index + 1,
      date: evolution.date,
      meaning: evolution.meaning,
      confidence: evolution.confidence,
      trigger: evolution.trigger
    })),
    evolution_velocity: calculateEvolutionVelocity(meaningEvolution),
    meaning_stability: calculateMeaningStability(meaningEvolution)
  };

  return progression;
}

/**
 * Calculate how quickly meaning evolves
 */
function calculateEvolutionVelocity(meaningEvolution) {
  if (meaningEvolution.length < 2) return 0;

  const firstDate = new Date(meaningEvolution[0].date);
  const lastDate = new Date(meaningEvolution[meaningEvolution.length - 1].date);
  const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

  return meaningEvolution.length / Math.max(daysDiff, 1); // evolutions per day
}

/**
 * Calculate meaning stability (consistency over time)
 */
function calculateMeaningStability(meaningEvolution) {
  if (meaningEvolution.length < 2) return 1.0;

  // Simple heuristic: higher confidence + manual triggers = more stable
  const avgConfidence = meaningEvolution.reduce((sum, m) => sum + m.confidence, 0) / meaningEvolution.length;
  const manualRatio = meaningEvolution.filter(m => m.trigger === 'manual_refinement').length / meaningEvolution.length;

  return (avgConfidence + manualRatio) / 2;
}

/**
 * Enhance AI glyph suggestions with user history
 */
function enhanceGlyphSuggestions(aiSuggestions, userGlyphs, content) {
  const enhanced = aiSuggestions.map(glyph => {
    const userGlyph = userGlyphs.find(ug => ug.glyph === glyph);
    
    return {
      glyph: glyph,
      suggestion_type: userGlyph ? 'personal_pattern' : 'ai_generated',
      usage_frequency: userGlyph?.usage_frequency || 0,
      personal_meaning: userGlyph?.meaning_evolution?.[userGlyph.meaning_evolution.length - 1]?.meaning,
      confidence: userGlyph ? 0.9 : 0.7
    };
  });

  // Add frequently used personal glyphs that might be relevant
  const personalSuggestions = userGlyphs
    .filter(ug => ug.usage_frequency > 2)
    .filter(ug => !aiSuggestions.includes(ug.glyph))
    .slice(0, 3)
    .map(ug => ({
      glyph: ug.glyph,
      suggestion_type: 'personal_frequent',
      usage_frequency: ug.usage_frequency,
      personal_meaning: ug.meaning_evolution?.[ug.meaning_evolution.length - 1]?.meaning,
      confidence: 0.8
    }));

  return [...enhanced, ...personalSuggestions];
}

export default router;
