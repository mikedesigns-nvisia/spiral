import express from 'express';
import { supabase, supabaseAdmin } from '../database/connection.js';
import { authenticateUser, rateLimitByOperation } from '../middleware/auth.js';
import ReflectiveAgent from '../services/ReflectiveAgent.js';

const router = express.Router();
const reflectiveAgent = new ReflectiveAgent();

/**
 * GET /api/constellations
 * Generate thematic clustering of user entries based on glyphs and semantic patterns
 */
router.get('/',
  authenticateUser,
  rateLimitByOperation('constellation_mapping'),
  async (req, res) => {
    try {
      const {
        timeframe = '90d', // 30d, 90d, 365d, all
        glyph_filter,
        resonance_threshold = 0.3,
        cluster_method = 'semantic' // semantic, symbolic, temporal, hybrid
      } = req.query;

      console.log(`🌌 Generating constellation map for user ${req.user.id}`);

      // Get user entries within timeframe
      let query = supabase
        .from('entries')
        .select(`
          id,
          content,
          created_at,
          tone,
          glyphs,
          embedding,
          word_count
        `)
        .eq('user_id', req.user.id)
        .not('embedding', 'is', null)
        .order('created_at', { ascending: false });

      // Apply timeframe filter
      if (timeframe !== 'all') {
        const days = parseInt(timeframe.replace('d', ''));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      // Apply glyph filter if specified
      if (glyph_filter) {
        const glyphArray = Array.isArray(glyph_filter) ? glyph_filter : [glyph_filter];
        query = query.overlaps('glyphs', glyphArray);
      }

      const { data: entries, error } = await query.limit(500);

      if (error) {
        console.error('Error fetching entries for constellation:', error);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch entries for constellation mapping'
        });
      }

      if (!entries || entries.length === 0) {
        return res.json({
          constellations: [],
          metadata: {
            total_entries: 0,
            timeframe,
            cluster_method
          }
        });
      }

      // Generate constellation clusters
      const constellations = await generateConstellations(
        entries,
        cluster_method,
        parseFloat(resonance_threshold)
      );

      res.json({
        constellations,
        metadata: {
          total_entries: entries.length,
          total_clusters: constellations.length,
          timeframe,
          cluster_method,
          resonance_threshold: parseFloat(resonance_threshold),
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Constellation generation error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to generate constellation map'
      });
    }
  }
);

/**
 * GET /api/constellations/themes
 * Get thematic analysis of user's journal patterns
 */
router.get('/themes',
  authenticateUser,
  rateLimitByOperation('theme_analysis'),
  async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;

      // Get glyph frequency analysis
      const { data: glyphData, error: glyphError } = await supabase
        .from('glyph_evolutions')
        .select('glyph, usage_frequency, meaning_evolution')
        .eq('user_id', req.user.id)
        .order('usage_frequency', { ascending: false })
        .limit(20);

      if (glyphError) {
        console.error('Error fetching glyph themes:', glyphError);
      }

      // Get mood pattern analysis
      const { data: moodData, error: moodError } = await supabase
        .from('entries')
        .select('tone, created_at')
        .eq('user_id', req.user.id)
        .not('tone', 'is', null);

      if (moodError) {
        console.error('Error fetching mood themes:', moodError);
      }

      // Analyze patterns
      const themes = {
        dominant_glyphs: glyphData?.slice(0, 10) || [],
        mood_patterns: analyzeMoodPatterns(moodData || []),
        temporal_rhythms: analyzeTemporalRhythms(moodData || []),
        emerging_symbols: identifyEmergingSymbols(glyphData || [])
      };

      res.json({
        themes,
        analysis_period: timeframe,
        analyzed_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Theme analysis error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to analyze themes'
      });
    }
  }
);

/**
 * Generate constellation clusters from entries
 */
async function generateConstellations(entries, method, threshold) {
  const clusters = [];
  const processed = new Set();

  for (let i = 0; i < entries.length; i++) {
    if (processed.has(entries[i].id)) continue;

    const cluster = {
      id: `cluster_${clusters.length + 1}`,
      center_entry: entries[i],
      related_entries: [],
      theme: await identifyClusterTheme(entries[i]),
      resonance_scores: [],
      visual_coordinates: generateVisualCoordinates(clusters.length),
      created_at: new Date().toISOString()
    };

    processed.add(entries[i].id);

    // Find related entries based on clustering method
    for (let j = i + 1; j < entries.length; j++) {
      if (processed.has(entries[j].id)) continue;

      const similarity = calculateSimilarity(entries[i], entries[j], method);
      
      if (similarity >= threshold) {
        cluster.related_entries.push(entries[j]);
        cluster.resonance_scores.push({
          entry_id: entries[j].id,
          similarity_score: similarity,
          connection_type: method
        });
        processed.add(entries[j].id);
      }
    }

    // Only include clusters with multiple entries
    if (cluster.related_entries.length > 0) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Calculate similarity between entries based on method
 */
function calculateSimilarity(entry1, entry2, method) {
  switch (method) {
    case 'semantic':
      return reflectiveAgent.calculateSemanticSimilarity(entry1.embedding, entry2.embedding);
    
    case 'symbolic':
      return reflectiveAgent.calculateSymbolicSimilarity(entry1.glyphs, entry2.glyphs);
    
    case 'temporal':
      return reflectiveAgent.calculateTemporalResonance(
        new Date(entry1.created_at),
        new Date(entry2.created_at)
      );
    
    case 'hybrid':
      const semantic = reflectiveAgent.calculateSemanticSimilarity(entry1.embedding, entry2.embedding);
      const symbolic = reflectiveAgent.calculateSymbolicSimilarity(entry1.glyphs, entry2.glyphs);
      const temporal = reflectiveAgent.calculateTemporalResonance(
        new Date(entry1.created_at),
        new Date(entry2.created_at)
      );
      return (semantic * 0.5 + symbolic * 0.3 + temporal * 0.2);
    
    default:
      return 0;
  }
}

/**
 * Identify thematic essence of a cluster
 */
async function identifyClusterTheme(centerEntry) {
  const dominantGlyphs = centerEntry.glyphs?.slice(0, 3) || [];
  const mood = centerEntry.tone?.mood || 'neutral';
  const energy = centerEntry.tone?.energy || 'balanced';

  return {
    primary_glyphs: dominantGlyphs,
    emotional_tone: `${mood}_${energy}`,
    keywords: extractKeywords(centerEntry.content),
    sacred_geometry: centerEntry.tone?.sacred_geometry?.primary_shape || 'circle'
  };
}

/**
 * Generate visual coordinates for constellation mapping
 */
function generateVisualCoordinates(index) {
  // Create spiral pattern for constellation placement
  const angle = index * 2.39996; // Golden angle for natural spiral
  const radius = Math.sqrt(index + 1) * 50;
  
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: index * 10, // Depth for 3D visualization
    angle: angle,
    radius: radius
  };
}

/**
 * Extract keywords from content
 */
function extractKeywords(content) {
  // Simple keyword extraction - could be enhanced with NLP
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were', 'will', 'when', 'what', 'where'].includes(word));
  
  // Count frequency and return top keywords
  const frequency = {};
  words.forEach(word => frequency[word] = (frequency[word] || 0) + 1);
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Analyze mood patterns over time
 */
function analyzeMoodPatterns(moodData) {
  const patterns = {
    dominant_moods: {},
    energy_trends: {},
    weekly_patterns: Array(7).fill(0).map(() => ({ mood_counts: {}, energy_counts: {} })),
    monthly_trends: []
  };

  moodData.forEach(entry => {
    if (!entry.tone) return;

    const mood = entry.tone.mood;
    const energy = entry.tone.energy;
    const date = new Date(entry.created_at);
    const dayOfWeek = date.getDay();

    // Count dominant moods and energies
    patterns.dominant_moods[mood] = (patterns.dominant_moods[mood] || 0) + 1;
    patterns.energy_trends[energy] = (patterns.energy_trends[energy] || 0) + 1;

    // Weekly patterns
    patterns.weekly_patterns[dayOfWeek].mood_counts[mood] = 
      (patterns.weekly_patterns[dayOfWeek].mood_counts[mood] || 0) + 1;
    patterns.weekly_patterns[dayOfWeek].energy_counts[energy] = 
      (patterns.weekly_patterns[dayOfWeek].energy_counts[energy] || 0) + 1;
  });

  return patterns;
}

/**
 * Analyze temporal rhythms and cycles
 */
function analyzeTemporalRhythms(moodData) {
  // Analyze patterns by time of creation, seasonal cycles, etc.
  const rhythms = {
    daily_peaks: analyzeHourlyPatterns(moodData),
    seasonal_shifts: analyzeSeasonalPatterns(moodData),
    lunar_correlations: analyzeLunarPatterns(moodData)
  };

  return rhythms;
}

/**
 * Identify emerging symbols and their evolution
 */
function identifyEmergingSymbols(glyphData) {
  return glyphData
    .filter(glyph => glyph.usage_frequency > 0)
    .sort((a, b) => {
      // Sort by recent usage growth
      const aGrowth = glyph.meaning_evolution?.length || 0;
      const bGrowth = glyph.meaning_evolution?.length || 0;
      return bGrowth - aGrowth;
    })
    .slice(0, 10)
    .map(glyph => ({
      glyph: glyph.glyph,
      frequency: glyph.usage_frequency,
      evolution_depth: glyph.meaning_evolution?.length || 0,
      latest_meaning: glyph.meaning_evolution?.[glyph.meaning_evolution.length - 1]?.meaning
    }));
}

function analyzeHourlyPatterns(data) {
  // Placeholder for hourly pattern analysis
  return { peak_hours: [], energy_cycles: [] };
}

function analyzeSeasonalPatterns(data) {
  // Placeholder for seasonal pattern analysis
  return { seasonal_moods: {}, energy_shifts: {} };
}

function analyzeLunarPatterns(data) {
  // Placeholder for lunar correlation analysis
  return { lunar_mood_correlation: 0, phase_preferences: {} };
}

export default router;
