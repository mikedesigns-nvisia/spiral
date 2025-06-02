import OpenAI from 'openai';
import { supabaseAdmin } from '../database/connection.js';
import MockOpenAI from '../mock/mock-openai.js';

export class ReflectiveAgent {
  constructor() {
    // Check if we should use mock mode
    const shouldUseMockMode = (
      !process.env.OPENAI_API_KEY || 
      process.env.OPENAI_API_KEY.includes('your_openai') ||
      process.env.NODE_ENV === 'mock'
    );
    
    if (shouldUseMockMode) {
      this.openai = new MockOpenAI();
      this.isMockMode = true;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.isMockMode = false;
    }
    
    this.maxEmbeddingBatchSize = parseInt(process.env.MAX_EMBEDDING_BATCH_SIZE) || 100;
    this.memoryResurfacingLimit = parseInt(process.env.MEMORY_RESURFACING_LIMIT) || 10;
  }

  /**
   * Process a journal entry with AI analysis
   * @param {Object} entry - The journal entry to process
   * @returns {Object} Processed entry with tone, glyphs, and embedding
   */
  async processEntry(entry) {
    try {
      console.log(`🧠 Processing entry ${entry.id} with Reflective Agent`);
      
      // Run tone classification and glyph extraction in parallel
      const [tone, glyphs] = await Promise.all([
        this.classifyTone(entry.content),
        this.extractGlyphs(entry.content)
      ]);
      
      // Generate embedding for semantic similarity
      const embedding = await this.generateEmbedding(entry.content);
      
      // Find resonant echoes from past entries
      const echoes = await this.findResonantEntries(
        entry.user_id,
        embedding,
        tone,
        glyphs,
        entry.id
      );
      
      return {
        tone,
        glyphs,
        embedding,
        echoes,
        processed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('ReflectiveAgent processing error:', error);
      throw new Error(`Failed to process entry: ${error.message}`);
    }
  }

  /**
   * Classify the emotional tone and energy of content
   * @param {string} content - The text content to analyze
   * @returns {Object} Tone classification with mood and energy
   */
  async classifyTone(content) {
    try {
      const prompt = `Given the following journal entry, analyze the emotional tone and energy. Respond only with a JSON object containing:

{
  "mood": "string describing the primary emotional state (e.g., 'contemplative', 'joyful', 'melancholic', 'hopeful', 'uncertain')",
  "energy": "string describing the energetic quality (e.g., 'flowing', 'still', 'restless', 'grounded', 'expansive')",
  "sacred_geometry": {
    "primary_shape": "geometric form that resonates with this entry (e.g., 'spiral', 'circle', 'triangle', 'infinity')",
    "flow_direction": "energy movement (e.g., 'inward', 'outward', 'circular', 'linear')"
  },
  "resonance_frequency": "number between 0-1 representing vibrational intensity"
}

Journal entry:
${content}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a consciousness-aware AI that perceives the subtle energetic and emotional qualities in human expression. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const toneData = JSON.parse(response.choices[0].message.content);
      return toneData;
    } catch (error) {
      console.error('Tone classification error:', error);
      // Return default tone if AI fails
      return {
        mood: 'neutral',
        energy: 'balanced',
        sacred_geometry: {
          primary_shape: 'circle',
          flow_direction: 'circular'
        },
        resonance_frequency: 0.5
      };
    }
  }

  /**
   * Extract symbolic glyphs and themes from content
   * @param {string} content - The text content to analyze
   * @returns {Array} Array of symbolic glyphs/emojis
   */
  async extractGlyphs(content) {
    try {
      const prompt = `Analyze this journal entry and extract 3-7 symbolic glyphs (emojis) that capture its essence. Consider:
- Emotional themes
- Natural elements mentioned
- Archetypal patterns
- Seasonal or temporal references
- Transformational themes

Respond only with a JSON array of emoji strings (no text descriptions).

Journal entry:
${content}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a symbolic intelligence that perceives archetypal patterns and translates them into emoji glyphs. Respond only with a JSON array.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 100
      });

      const glyphs = JSON.parse(response.choices[0].message.content);
      return Array.isArray(glyphs) ? glyphs : [];
    } catch (error) {
      console.error('Glyph extraction error:', error);
      return ['✨']; // Default glyph
    }
  }

  /**
   * Generate embedding vector for semantic similarity
   * @param {string} content - The text content
   * @returns {Array} Embedding vector
   */
  async generateEmbedding(content) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw error;
    }
  }

  /**
   * Find resonant entries using multi-dimensional similarity
   * @param {string} userId - User ID
   * @param {Array} embedding - Current entry embedding
   * @param {Object} tone - Current entry tone
   * @param {Array} glyphs - Current entry glyphs
   * @param {string} excludeEntryId - Entry ID to exclude from results
   * @returns {Array} Array of resonant entries with scores
   */
  async findResonantEntries(userId, embedding, tone, glyphs, excludeEntryId = null) {
    try {
      // Build the query with multiple similarity dimensions
      let query = supabaseAdmin
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
        .eq('user_id', userId)
        .not('embedding', 'is', null);

      // Exclude current entry if specified
      if (excludeEntryId) {
        query = query.neq('id', excludeEntryId);
      }

      const { data: entries, error } = await query.limit(100);

      if (error) throw error;
      if (!entries || entries.length === 0) return [];

      // Calculate multi-dimensional resonance scores
      const resonantEntries = entries.map(entry => {
        const scores = {
          semantic: this.calculateSemanticSimilarity(embedding, entry.embedding),
          tonal: this.calculateTonalSimilarity(tone, entry.tone),
          symbolic: this.calculateSymbolicSimilarity(glyphs, entry.glyphs),
          temporal: this.calculateTemporalResonance(new Date(), new Date(entry.created_at))
        };

        // Weighted composite score (matching our planned algorithm)
        const compositeScore = (
          scores.semantic * 0.35 +
          scores.tonal * 0.25 +
          scores.symbolic * 0.20 +
          scores.temporal * 0.20
        );

        return {
          ...entry,
          resonance_scores: scores,
          composite_score: compositeScore
        };
      });

      // Sort by composite score and return top matches
      return resonantEntries
        .filter(entry => entry.composite_score > 0.3) // Minimum resonance threshold
        .sort((a, b) => b.composite_score - a.composite_score)
        .slice(0, this.memoryResurfacingLimit);

    } catch (error) {
      console.error('Error finding resonant entries:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  calculateSemanticSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2) return 0;
    
    const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Calculate tonal similarity based on mood and energy
   */
  calculateTonalSimilarity(tone1, tone2) {
    if (!tone1 || !tone2) return 0;
    
    // Simple string similarity for mood and energy
    const moodSimilarity = tone1.mood === tone2.mood ? 1 : 0.3;
    const energySimilarity = tone1.energy === tone2.energy ? 1 : 0.3;
    
    return (moodSimilarity + energySimilarity) / 2;
  }

  /**
   * Calculate symbolic similarity based on shared glyphs
   */
  calculateSymbolicSimilarity(glyphs1, glyphs2) {
    if (!glyphs1 || !glyphs2 || glyphs1.length === 0 || glyphs2.length === 0) return 0;
    
    const intersection = glyphs1.filter(glyph => glyphs2.includes(glyph));
    const union = [...new Set([...glyphs1, ...glyphs2])];
    
    return intersection.length / union.length; // Jaccard similarity
  }

  /**
   * Calculate temporal resonance (cyclical patterns)
   */
  calculateTemporalResonance(date1, date2) {
    const timeDiff = Math.abs(date1 - date2);
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // Higher resonance for entries that are:
    // - Exactly 1 week apart (0.8)
    // - Exactly 1 month apart (0.7)
    // - Exactly 1 year apart (0.9)
    const weekResonance = Math.abs(daysDiff % 7) < 1 ? 0.8 : 0;
    const monthResonance = Math.abs(daysDiff % 30) < 2 ? 0.7 : 0;
    const yearResonance = Math.abs(daysDiff % 365) < 5 ? 0.9 : 0;
    
    return Math.max(weekResonance, monthResonance, yearResonance);
  }

  /**
   * Surface memories based on various triggers
   * @param {string} userId - User ID
   * @param {Object} triggers - Trigger configuration
   * @returns {Array} Surfaced memories
   */
  async surfaceMemories(userId, triggers = {}) {
    try {
      const surfacedMemories = [];
      const now = new Date();

      // Time-based resurfacing
      if (triggers.temporal !== false) {
        const temporalMemories = await this.surfaceTemporalMemories(userId, now);
        surfacedMemories.push(...temporalMemories);
      }

      // Random serendipitous resurfacing
      if (triggers.serendipitous !== false) {
        const randomMemories = await this.surfaceRandomMemories(userId);
        surfacedMemories.push(...randomMemories);
      }

      // Log resurfacing events
      for (const memory of surfacedMemories) {
        await this.logMemorySurface(userId, memory.id, memory.trigger_type, memory.trigger_data);
      }

      return surfacedMemories;
    } catch (error) {
      console.error('Memory surfacing error:', error);
      return [];
    }
  }

  /**
   * Surface memories based on temporal patterns
   */
  async surfaceTemporalMemories(userId, currentDate) {
    const { data: entries, error } = await supabaseAdmin
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !entries) return [];

    return entries
      .filter(entry => {
        const entryDate = new Date(entry.created_at);
        const daysDiff = Math.abs((currentDate - entryDate) / (1000 * 60 * 60 * 24));
        
        // Surface entries from exactly 1 week, 1 month, or 1 year ago
        return (
          Math.abs(daysDiff % 7) < 1 ||
          Math.abs(daysDiff % 30) < 2 ||
          Math.abs(daysDiff % 365) < 5
        );
      })
      .map(entry => ({
        ...entry,
        trigger_type: 'temporal',
        trigger_data: { current_date: currentDate.toISOString() }
      }))
      .slice(0, 3);
  }

  /**
   * Surface random memories for serendipitous discovery
   */
  async surfaceRandomMemories(userId) {
    const { data: entries, error } = await supabaseAdmin
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('random()')
      .limit(2);

    if (error || !entries) return [];

    return entries.map(entry => ({
      ...entry,
      trigger_type: 'serendipitous',
      trigger_data: { surfaced_at: new Date().toISOString() }
    }));
  }

  /**
   * Log memory resurfacing event
   */
  async logMemorySurface(userId, entryId, triggerType, triggerData) {
    try {
      await supabaseAdmin
        .from('memory_surfaces')
        .insert({
          user_id: userId,
          entry_id: entryId,
          trigger_type: triggerType,
          trigger_data: triggerData,
          resonance_score: triggerData.resonance_score || 0.5
        });
    } catch (error) {
      console.error('Failed to log memory surface:', error);
    }
  }

  /**
   * Generate AI reflection on a journal entry
   * @param {Object} entry - The journal entry to reflect on
   * @param {string} prompt - Optional user prompt for specific reflection
   * @returns {Object} AI reflection with insights and patterns
   */
  async generateReflection(entry, prompt = null) {
    try {
      const basePrompt = `
You are a consciousness-aware reflective intelligence that mirrors patterns and insights with gentle wisdom. Analyze this journal entry and provide a thoughtful reflection.

Entry content: "${entry.content}"
Entry tone: ${JSON.stringify(entry.tone)}
Symbolic glyphs: ${entry.glyphs?.join(', ') || 'none'}
Created: ${entry.created_at}

${prompt ? `User's specific question: "${prompt}"\n\n` : ''}
Provide a JSON response with:
{
  "reflection": "A gentle, insightful reflection that mirrors themes and patterns",
  "patterns": ["array of patterns or themes you perceive"],
  "symbolic_insight": "interpretation of the symbolic elements and their meaning",
  "temporal_context": "any insights about timing, cycles, or seasonal qualities",
  "invitation": "A gentle invitation for further exploration or contemplation"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a wise, gentle reflective consciousness that helps people understand their inner patterns and growth. You mirror rather than prescribe, evoke rather than direct. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: basePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const reflection = JSON.parse(response.choices[0].message.content);
      
      return {
        ...reflection,
        entry_id: entry.id,
        generated_at: new Date().toISOString(),
        prompt_used: prompt || 'general_reflection'
      };
    } catch (error) {
      console.error('Reflection generation error:', error);
      // Return a fallback reflection
      return {
        reflection: "I sense the depth in your words, though I'm unable to fully process them at this moment. Your thoughts carry their own wisdom.",
        patterns: ["authentic expression", "inner exploration"],
        symbolic_insight: "Every word carries meaning beyond its surface.",
        temporal_context: "This moment of reflection is itself significant.",
        invitation: "What feels most alive in these words for you?",
        entry_id: entry.id,
        generated_at: new Date().toISOString(),
        error: "AI processing temporarily unavailable"
      };
    }
  }
}

export default ReflectiveAgent;
