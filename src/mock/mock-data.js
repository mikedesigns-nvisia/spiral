// Mock data for running The Reflector Codex without external APIs
import crypto from 'crypto';

// Mock realistic journal entries (same as our seeding data)
export const MOCK_ENTRIES = [
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    content: "Starting this digital journal feels like opening a door to something I haven't explored before. There's something about putting thoughts into words that makes them more real, more tangible. Today I'm feeling optimistic about this new chapter. 🌱",
    tone: {
      mood: "hopeful",
      energy: "expansive",
      sacred_geometry: { primary_shape: 'spiral', flow_direction: 'outward' },
      resonance_frequency: 0.9
    },
    glyphs: ["🌱", "🚪", "✨"],
    word_count: 45,
    estimated_read_time: 1,
    privacy_level: "mirror",
    created_at: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    content: "Had a difficult conversation with my sister today. We've been carrying this tension for months, and finally addressing it felt both terrifying and necessary. Sometimes growth requires walking through the fire. The truth has a way of burning away what's no longer serving us. 🔥",
    tone: {
      mood: "contemplative",
      energy: "intense",
      sacred_geometry: { primary_shape: 'circle', flow_direction: 'inward' },
      resonance_frequency: 0.8
    },
    glyphs: ["🔥", "⚖️", "🗣️"],
    word_count: 52,
    estimated_read_time: 1,
    privacy_level: "mirror",
    created_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    content: "Woke up to the most incredible sunrise this morning. The way the light gradually painted the sky reminded me that everything in nature happens in perfect timing. No rushing, no forcing - just graceful unfolding. I want to embody more of this natural rhythm in my life. 🌅",
    tone: {
      mood: "peaceful",
      energy: "balanced",
      sacred_geometry: { primary_shape: 'hexagon', flow_direction: 'circular' },
      resonance_frequency: 0.6
    },
    glyphs: ["🌅", "⏰", "🌸"],
    word_count: 58,
    estimated_read_time: 1,
    privacy_level: "mirror",
    created_at: new Date(Date.now() - 82 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 82 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    content: "The synchronicities have been intense lately. Yesterday I was thinking about an old friend, and she called out of nowhere. Today I found the exact book I needed at a random coffee shop. It's like the universe is winking at me. Either I'm becoming more aware, or reality is more magical than I previously believed. ✨",
    tone: {
      mood: "wonder",
      energy: "electric",
      sacred_geometry: { primary_shape: 'spiral', flow_direction: 'outward' },
      resonance_frequency: 0.9
    },
    glyphs: ["✨", "🔗", "😉"],
    word_count: 67,
    estimated_read_time: 1,
    privacy_level: "mirror",
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    content: "Something is shifting in my understanding of love. It's less about attachment and more about appreciation. Less about need and more about celebration. Love as a state of being rather than an emotion or transaction. This feels revolutionary. 💞",
    tone: {
      mood: "loving",
      energy: "radiating",
      sacred_geometry: { primary_shape: 'infinity', flow_direction: 'circular' },
      resonance_frequency: 0.9
    },
    glyphs: ["💞", "🔄", "🌟"],
    word_count: 43,
    estimated_read_time: 1,
    privacy_level: "mirror",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock glyph evolutions
export const MOCK_GLYPH_EVOLUTIONS = [
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    glyph: "🌱",
    meaning_evolution: [
      {
        date: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString(),
        meaning: "New beginnings and fresh starts",
        context: "Used in journal reflection",
        trigger: "ai_inference",
        confidence: 0.8
      },
      {
        date: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(),
        meaning: "The fertile potential within uncertainty",
        context: "Used in journal reflection",
        trigger: "pattern_recognition",
        confidence: 0.9
      }
    ],
    usage_frequency: 8,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    glyph: "🔥",
    meaning_evolution: [
      {
        date: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
        meaning: "Transformative challenges and purification",
        context: "Used in journal reflection",
        trigger: "ai_inference",
        confidence: 0.9
      }
    ],
    usage_frequency: 5,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    user_id: "demo-user-id",
    glyph: "✨",
    meaning_evolution: [
      {
        date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        meaning: "Magic and synchronicity in daily life",
        context: "Used in journal reflection",
        trigger: "ai_inference",
        confidence: 0.7
      },
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        meaning: "The extraordinary hidden within the ordinary",
        context: "Used in journal reflection",
        trigger: "manual",
        confidence: 1.0
      }
    ],
    usage_frequency: 12,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock constellations
export const MOCK_CONSTELLATIONS = [
  {
    id: crypto.randomUUID(),
    center_entry: MOCK_ENTRIES[0],
    related_entries: [MOCK_ENTRIES[1], MOCK_ENTRIES[2]],
    theme: {
      keywords: ["Growth", "Transformation", "New Beginnings"],
      emotional_tone: "Hopeful exploration",
      sacred_geometry: "spiral",
      primary_glyphs: ["🌱", "🔥", "✨"]
    },
    resonance_scores: [
      { entry_id: MOCK_ENTRIES[1].id, similarity_score: 0.8, resonance_type: "thematic" },
      { entry_id: MOCK_ENTRIES[2].id, similarity_score: 0.7, resonance_type: "symbolic" }
    ],
    cluster_method: "hybrid",
    created_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    center_entry: MOCK_ENTRIES[3],
    related_entries: [MOCK_ENTRIES[4]],
    theme: {
      keywords: ["Synchronicity", "Love", "Awareness"],
      emotional_tone: "Mystical wonder",
      sacred_geometry: "infinity",
      primary_glyphs: ["✨", "💞", "🔗"]
    },
    resonance_scores: [
      { entry_id: MOCK_ENTRIES[4].id, similarity_score: 0.9, resonance_type: "emotional" }
    ],
    cluster_method: "hybrid",
    created_at: new Date().toISOString()
  }
];

// Mock reflections
export const MOCK_REFLECTIONS = [
  {
    id: crypto.randomUUID(),
    entry: MOCK_ENTRIES[0],
    reflection: {
      reflection: "Your words carry the energy of fertile possibility - like seeds planted in consciousness soil. The door metaphor suggests you're at a threshold moment, ready to cross into unexplored territories of self. Notice how you describe thoughts becoming 'more real' through words - this is the alchemy of consciousness meeting expression.",
      symbolic_insight: "The 🌱 glyph represents not just new beginnings, but the invisible potential that exists before manifestation. Your optimism is the sunlight feeding this emerging growth.",
      patterns: ["threshold moments", "consciousness expansion", "potential activation"],
      temporal_context: "This entry marks a beginning - track how this seed of intention unfolds in future reflections",
      invitation: "Consider: What specific door are you opening? What would you like to plant in this new chapter of exploration?",
      generated_at: new Date().toISOString()
    },
    echoes: [
      {
        id: crypto.randomUUID(),
        related_entry: MOCK_ENTRIES[1],
        trigger_type: "symbolic",
        resonance_score: 0.8,
        similarity_explanation: "Both entries involve crossing thresholds - one opening a door to exploration, the other walking through fire for growth"
      }
    ]
  }
];

// Mock echoes (resurfaced memories)
export const MOCK_ECHOES = [
  {
    id: crypto.randomUUID(),
    original_entry: MOCK_ENTRIES[1],
    trigger_entry: MOCK_ENTRIES[0],
    trigger_type: "symbolic",
    resonance_score: 0.85,
    similarity_explanation: "Both entries involve crossing thresholds - opening doors and walking through fire represent different aspects of transformation",
    surfaced_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    original_entry: MOCK_ENTRIES[3],
    trigger_entry: MOCK_ENTRIES[4],
    trigger_type: "thematic",
    resonance_score: 0.92,
    similarity_explanation: "Deep connection between synchronicity awareness and evolved understanding of love - both represent expanded consciousness",
    surfaced_at: new Date().toISOString()
  }
];

// Mock AI responses
export const MOCK_AI_RESPONSES = {
  reflection: {
    choices: [{
      message: {
        content: JSON.stringify({
          reflection: "Your consciousness is weaving beautiful patterns of growth and awareness. This entry contains seeds of transformation that will bloom in unexpected ways.",
          symbolic_insight: "The symbols you've chosen carry archetypal wisdom - they're not random but reflect deep patterns in your psyche.",
          patterns: ["growth", "transformation", "awareness"],
          temporal_context: "This moment represents a significant shift in your journey",
          invitation: "What would happen if you trusted this process of unfolding completely?"
        })
      }
    }]
  },
  glyph_suggestion: {
    choices: [{
      message: {
        content: JSON.stringify([
          { glyph: "🦋", meaning: "Transformation and metamorphosis", confidence: 0.9 },
          { glyph: "🌙", meaning: "Cycles and intuitive wisdom", confidence: 0.8 },
          { glyph: "💎", meaning: "Clarity and precious insights", confidence: 0.7 }
        ])
      }
    }]
  }
};

export const mockUser = {
  id: "demo-user-id",
  email: "demo@reflectorcodex.com",
  full_name: "Demo User",
  created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
};
