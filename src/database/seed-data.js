import { supabaseAdmin } from './connection.js';
import crypto from 'crypto';

// Sample journal entries with realistic progression over time
const SAMPLE_ENTRIES = [
  {
    content: "Starting this digital journal feels like opening a door to something I haven't explored before. There's something about putting thoughts into words that makes them more real, more tangible. Today I'm feeling optimistic about this new chapter. 🌱",
    mood: "hopeful",
    energy: "expansive", 
    glyphs: ["🌱", "🚪", "✨"],
    days_ago: 89
  },
  {
    content: "Had a difficult conversation with my sister today. We've been carrying this tension for months, and finally addressing it felt both terrifying and necessary. Sometimes growth requires walking through the fire. The truth has a way of burning away what's no longer serving us. 🔥",
    mood: "contemplative",
    energy: "intense",
    glyphs: ["🔥", "⚖️", "🗣️"],
    days_ago: 85
  },
  {
    content: "Woke up to the most incredible sunrise this morning. The way the light gradually painted the sky reminded me that everything in nature happens in perfect timing. No rushing, no forcing - just graceful unfolding. I want to embody more of this natural rhythm in my life. 🌅",
    mood: "peaceful",
    energy: "balanced",
    glyphs: ["🌅", "⏰", "🌸"],
    days_ago: 82
  },
  {
    content: "Working on this creative project has been more challenging than I expected. Every time I think I've found the right direction, something feels off. Maybe the resistance is trying to tell me something. Perhaps I'm forcing a vision that isn't authentic to who I'm becoming. 🎨",
    mood: "contemplative",
    energy: "restless",
    glyphs: ["🎨", "🌊", "🤔"],
    days_ago: 78
  },
  {
    content: "Spent the evening reading about ancient wisdom traditions and their understanding of consciousness. It's fascinating how different cultures have developed similar insights about the nature of awareness. The interconnectedness of all things feels more real to me lately. 📚",
    mood: "curious",
    energy: "expansive",
    glyphs: ["📚", "🔗", "🧘"],
    days_ago: 75
  },
  {
    content: "Today marked six months since I started this inner work journey. Looking back, I can see patterns I couldn't recognize before. The way I respond to challenges has shifted subtly but significantly. Growth is happening in layers, like an onion being peeled back one ring at a time. 🧅",
    mood: "reflective",
    energy: "grounded",
    glyphs: ["🧅", "🔄", "📈"],
    days_ago: 71
  },
  {
    content: "Had the strangest dream last night about being in a library where all the books contained memories instead of words. I could open any book and experience someone else's moment of profound realization. Woke up wondering if that's what empathy really is - accessing the universal library of human experience. 💭",
    mood: "mystical",
    energy: "fluid",
    glyphs: ["💭", "📖", "🔮"],
    days_ago: 68
  },
  {
    content: "Feeling incredibly grateful today. Sometimes gratitude hits like a wave - sudden and overwhelming in the best way. Made a list of 20 things I appreciate about my life right now. Number one: the capacity to feel this deeply. 🙏",
    mood: "joyful",
    energy: "radiant",
    glyphs: ["🙏", "🌊", "💛"],
    days_ago: 64
  },
  {
    content: "The creative project I was struggling with suddenly clicked today. It was like puzzle pieces falling into place all at once. The resistance I felt earlier was actually guiding me toward a completely different approach. Sometimes the obstacles are the path. 🧩",
    mood: "triumphant",
    energy: "flowing",
    glyphs: ["🧩", "💡", "🌟"],
    days_ago: 61
  },
  {
    content: "Noticed I've been avoiding certain emotions lately - specifically the grief around changes in my life. Today I decided to sit with that sadness instead of pushing it away. It's interesting how allowing difficult feelings actually transforms them. The resistance to feeling creates more suffering than the feeling itself. 😢",
    mood: "melancholic",
    energy: "deep",
    glyphs: ["😢", "🌧️", "🤗"],
    days_ago: 57
  },
  {
    content: "Started a new meditation practice focused on loving-kindness. Sending compassion to difficult people in my life is challenging but surprisingly healing. It's like cleaning windows - the world becomes clearer when we remove the film of resentment. ❤️",
    mood: "compassionate",
    energy: "warm",
    glyphs: ["❤️", "🧘", "🪟"],
    days_ago: 54
  },
  {
    content: "The synchronicities have been intense lately. Yesterday I was thinking about an old friend, and she called out of nowhere. Today I found the exact book I needed at a random coffee shop. It's like the universe is winking at me. Either I'm becoming more aware, or reality is more magical than I previously believed. ✨",
    mood: "wonder",
    energy: "electric",
    glyphs: ["✨", "🔗", "😉"],
    days_ago: 50
  },
  {
    content: "Had a breakthrough in therapy today about old patterns I've been unconsciously repeating. Seeing the invisible threads that connect past and present feels both liberating and overwhelming. How much of what I thought was 'me' is actually inherited programming? 🧬",
    mood: "illuminated",
    energy: "intense",
    glyphs: ["🧬", "🔍", "💡"],
    days_ago: 47
  },
  {
    content: "Spent the day in nature without any devices. The silence was profound - not empty, but full of subtle sounds I usually miss. The wind through leaves sounds like whispered secrets. I remembered why ancient peoples saw consciousness in trees and stones. 🌳",
    mood: "reverent",
    energy: "grounded",
    glyphs: ["🌳", "🤫", "🌿"],
    days_ago: 43
  },
  {
    content: "Working with the concept of impermanence today. Everything I'm attached to will eventually change or disappear. Instead of finding this depressing, I'm discovering it makes each moment more precious. Temporary doesn't mean meaningless. 🌸",
    mood: "philosophical",
    energy: "fluid",
    glyphs: ["🌸", "⏳", "💎"],
    days_ago: 40
  },
  {
    content: "My relationship with uncertainty is evolving. What used to trigger anxiety now feels like fertile ground for possibility. Not knowing what comes next used to terrify me; now it excites me. The unknown contains infinite potential. 🌱",
    mood: "courageous",
    energy: "open",
    glyphs: ["🌱", "❓", "🚀"],
    days_ago: 36
  },
  {
    content: "Realized today that I judge my spiritual progress the same way I judge everything else - linearly, comparatively, critically. But consciousness doesn't unfold like climbing a ladder. It's more like waves on a shore - advancing and receding in natural rhythms. 🌊",
    mood: "accepting",
    energy: "flowing",
    glyphs: ["🌊", "📊", "🔄"],
    days_ago: 33
  },
  {
    content: "Dancing alone in my living room to music that moves my soul. There's something sacred about uninhibited movement - it bypasses the mind and speaks directly to the body's wisdom. My cells remember how to be joyful. 💃",
    mood: "ecstatic",
    energy: "kinetic",
    glyphs: ["💃", "🎵", "⚡"],
    days_ago: 29
  },
  {
    content: "Feeling called to simplify my life more. Each possession I release feels like shedding an old skin. Material things I once thought were part of my identity now feel like costumes I no longer need to wear. Freedom is lighter than I imagined. 🎭",
    mood: "liberated",
    energy: "light",
    glyphs: ["🎭", "🪶", "✂️"],
    days_ago: 26
  },
  {
    content: "Had a profound conversation with a stranger at the coffee shop about the nature of time. She said something that's been echoing in my mind: 'The present moment contains all of time.' I think I'm beginning to understand what that means experientially, not just conceptually. ☕",
    mood: "contemplative", 
    energy: "expanded",
    glyphs: ["☕", "⏰", "🔄"],
    days_ago: 22
  },
  {
    content: "Working with forgiveness - both giving and receiving it. Forgiving myself for past mistakes feels harder than forgiving others. Self-compassion is a skill I'm still learning. Why do we hold ourselves to standards we wouldn't expect from our dearest friends? 🤝",
    mood: "tender",
    energy: "healing",
    glyphs: ["🤝", "💗", "🌈"],
    days_ago: 19
  },
  {
    content: "The creative project I've been working on is finally complete. Looking at it now, I can see how every struggle and breakthrough was necessary. The final piece contains layers of meaning I didn't consciously intend but somehow knew. Art is how the unconscious speaks. 🎨",
    mood: "fulfilled",
    energy: "complete",
    glyphs: ["🎨", "🏁", "🎯"],
    days_ago: 15
  },
  {
    content: "Experiencing a period of deep contentment. Not the kind that comes from external achievements, but the quiet satisfaction of being at peace with what is. This feels like what the mystics call 'ordinary enlightenment' - finding the sacred in the mundane. ☮️",
    mood: "serene",
    energy: "stable",
    glyphs: ["☮️", "🏠", "🌙"],
    days_ago: 12
  },
  {
    content: "Something is shifting in my understanding of love. It's less about attachment and more about appreciation. Less about need and more about celebration. Love as a state of being rather than an emotion or transaction. This feels revolutionary. 💞",
    mood: "loving",
    energy: "radiating",
    glyphs: ["💞", "🔄", "🌟"],
    days_ago: 8
  },
  {
    content: "Reflecting on this journaling journey. Reading back through earlier entries, I can see the evolution of my thoughts and perspective. It's like watching consciousness observe itself. The spiral of growth is visible in these pages. What a gift to witness my own becoming. 📖",
    mood: "grateful",
    energy: "reflective", 
    glyphs: ["📖", "🌀", "🎁"],
    days_ago: 5
  },
  {
    content: "Today I feel like I'm standing at the edge of something new. All the inner work has been preparing me for this next chapter. I don't know what it will bring, but I trust the process that has brought me this far. Ready to take the leap into unknown territory. 🦋",
    mood: "anticipatory",
    energy: "poised",
    glyphs: ["🦋", "🌉", "🚀"],
    days_ago: 2
  },
  {
    content: "Waking up this morning, I felt overwhelmed by the beauty of simply being alive. The sunlight, the sound of birds, the miracle of consciousness itself. Every moment is extraordinary when seen clearly. How did I ever take this wonder for granted? ✨",
    mood: "awestruck",
    energy: "luminous",
    glyphs: ["✨", "🌅", "👁️"],
    days_ago: 0
  }
];

// Sample glyph evolution data showing how symbols develop meaning over time
const SAMPLE_GLYPH_EVOLUTIONS = [
  {
    glyph: "🌱",
    evolutions: [
      { meaning: "New beginnings and fresh starts", trigger: "ai_inference", confidence: 0.8, days_ago: 89 },
      { meaning: "The fertile potential within uncertainty", trigger: "pattern_recognition", confidence: 0.9, days_ago: 36 },
      { meaning: "Gentle unfolding of consciousness", trigger: "manual", confidence: 1.0, days_ago: 15 }
    ]
  },
  {
    glyph: "🌊",
    evolutions: [
      { meaning: "Emotional waves and life's natural rhythms", trigger: "ai_inference", confidence: 0.7, days_ago: 78 },
      { meaning: "The flowing nature of growth and change", trigger: "emotional_resonance", confidence: 0.9, days_ago: 33 },
      { meaning: "Non-linear progression of spiritual awakening", trigger: "manual", confidence: 1.0, days_ago: 20 }
    ]
  },
  {
    glyph: "🔥",
    evolutions: [
      { meaning: "Transformative challenges and purification", trigger: "ai_inference", confidence: 0.9, days_ago: 85 },
      { meaning: "The sacred fire that burns away illusions", trigger: "pattern_recognition", confidence: 0.8, days_ago: 40 }
    ]
  },
  {
    glyph: "💡",
    evolutions: [
      { meaning: "Sudden insights and breakthrough moments", trigger: "ai_inference", confidence: 0.8, days_ago: 61 },
      { meaning: "The illumination that comes from seeing patterns", trigger: "emotional_resonance", confidence: 0.9, days_ago: 47 }
    ]
  },
  {
    glyph: "🌸",
    evolutions: [
      { meaning: "The beauty found in temporary experiences", trigger: "ai_inference", confidence: 0.7, days_ago: 40 },
      { meaning: "Embracing impermanence as sacred teaching", trigger: "manual", confidence: 1.0, days_ago: 25 }
    ]
  },
  {
    glyph: "🎨",
    evolutions: [
      { meaning: "Creative expression and artistic struggles", trigger: "ai_inference", confidence: 0.8, days_ago: 78 },
      { meaning: "The unconscious speaking through creative work", trigger: "pattern_recognition", confidence: 0.9, days_ago: 15 }
    ]
  },
  {
    glyph: "🧘",
    evolutions: [
      { meaning: "Meditation practice and inner stillness", trigger: "ai_inference", confidence: 0.8, days_ago: 54 },
      { meaning: "The cultivation of loving-kindness", trigger: "emotional_resonance", confidence: 0.9, days_ago: 45 }
    ]
  },
  {
    glyph: "✨",
    evolutions: [
      { meaning: "Magic and synchronicity in daily life", trigger: "ai_inference", confidence: 0.7, days_ago: 50 },
      { meaning: "The extraordinary hidden within the ordinary", trigger: "manual", confidence: 1.0, days_ago: 1 }
    ]
  },
  {
    glyph: "🌳",
    evolutions: [
      { meaning: "Connection to nature and ancient wisdom", trigger: "ai_inference", confidence: 0.8, days_ago: 43 },
      { meaning: "The consciousness present in all living things", trigger: "emotional_resonance", confidence: 0.9, days_ago: 30 }
    ]
  },
  {
    glyph: "💞",
    evolutions: [
      { meaning: "Evolving understanding of love", trigger: "ai_inference", confidence: 0.8, days_ago: 8 },
      { meaning: "Love as appreciation rather than attachment", trigger: "manual", confidence: 1.0, days_ago: 3 }
    ]
  }
];

// Generate realistic user data
const generateUser = () => ({
  id: crypto.randomUUID(),
  email: 'demo@reflectorcodex.com',
  full_name: 'Demo User',
  created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ago
});

// Generate embeddings (mock for seeding)
const generateMockEmbedding = (text) => {
  // Simple hash-based mock embedding for demonstration
  const hash = crypto.createHash('md5').update(text).digest('hex');
  const embedding = [];
  for (let i = 0; i < 1536; i++) {
    embedding.push((parseInt(hash.substr(i % 32, 2), 16) - 127.5) / 127.5);
  }
  return embedding;
};

// Generate sacred geometry based on mood
const getSacredGeometry = (mood) => {
  const geometryMap = {
    hopeful: { primary_shape: 'spiral', flow_direction: 'outward' },
    contemplative: { primary_shape: 'circle', flow_direction: 'inward' },
    peaceful: { primary_shape: 'hexagon', flow_direction: 'circular' },
    joyful: { primary_shape: 'triangle', flow_direction: 'outward' },
    melancholic: { primary_shape: 'infinity', flow_direction: 'oscillating' },
    mystical: { primary_shape: 'spiral', flow_direction: 'inward' },
    triumphant: { primary_shape: 'triangle', flow_direction: 'outward' },
    compassionate: { primary_shape: 'circle', flow_direction: 'circular' },
    wonder: { primary_shape: 'spiral', flow_direction: 'outward' },
    illuminated: { primary_shape: 'triangle', flow_direction: 'linear' },
    reverent: { primary_shape: 'hexagon', flow_direction: 'circular' },
    philosophical: { primary_shape: 'infinity', flow_direction: 'oscillating' },
    courageous: { primary_shape: 'triangle', flow_direction: 'outward' },
    accepting: { primary_shape: 'circle', flow_direction: 'circular' },
    ecstatic: { primary_shape: 'spiral', flow_direction: 'outward' },
    liberated: { primary_shape: 'infinity', flow_direction: 'linear' },
    tender: { primary_shape: 'circle', flow_direction: 'inward' },
    fulfilled: { primary_shape: 'hexagon', flow_direction: 'circular' },
    serene: { primary_shape: 'circle', flow_direction: 'circular' },
    loving: { primary_shape: 'infinity', flow_direction: 'circular' },
    grateful: { primary_shape: 'spiral', flow_direction: 'inward' },
    anticipatory: { primary_shape: 'triangle', flow_direction: 'outward' },
    awestruck: { primary_shape: 'spiral', flow_direction: 'outward' }
  };
  
  return geometryMap[mood] || { primary_shape: 'circle', flow_direction: 'circular' };
};

// Calculate resonance frequency based on energy and content
const getResonanceFrequency = (energy, content) => {
  const energyMap = {
    expansive: 0.9,
    intense: 0.8,
    balanced: 0.6,
    restless: 0.7,
    grounded: 0.5,
    fluid: 0.6,
    radiant: 0.9,
    flowing: 0.7,
    deep: 0.8,
    warm: 0.6,
    electric: 0.9,
    open: 0.7,
    kinetic: 0.8,
    light: 0.6,
    expanded: 0.8,
    healing: 0.7,
    complete: 0.9,
    stable: 0.5,
    radiating: 0.9,
    reflective: 0.6,
    poised: 0.7,
    luminous: 0.9
  };
  
  const baseFreq = energyMap[energy] || 0.6;
  const contentBoost = content.length > 200 ? 0.1 : 0;
  return Math.min(1.0, baseFreq + contentBoost);
};

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Generate user
    const user = generateUser();
    
    // Create user
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert(user)
      .select()
      .single();
    
    if (userError) {
      console.error('Error creating user:', userError);
      return;
    }
    
    console.log('✅ Created demo user');
    
    // Create journal entries
    const entries = [];
    for (const entry of SAMPLE_ENTRIES) {
      const createdAt = new Date(Date.now() - entry.days_ago * 24 * 60 * 60 * 1000);
      const embedding = generateMockEmbedding(entry.content);
      const sacredGeometry = getSacredGeometry(entry.mood);
      const resonanceFreq = getResonanceFrequency(entry.energy, entry.content);
      
      const entryData = {
        id: crypto.randomUUID(),
        user_id: userData.id,
        content: entry.content,
        tone: {
          mood: entry.mood,
          energy: entry.energy,
          sacred_geometry: sacredGeometry,
          resonance_frequency: resonanceFreq
        },
        glyphs: entry.glyphs,
        embedding: embedding,
        word_count: entry.content.split(' ').length,
        estimated_read_time: Math.ceil(entry.content.split(' ').length / 200),
        privacy_level: 'mirror',
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString()
      };
      
      entries.push(entryData);
    }
    
    const { error: entriesError } = await supabaseAdmin
      .from('entries')
      .insert(entries);
    
    if (entriesError) {
      console.error('Error creating entries:', entriesError);
      return;
    }
    
    console.log(`✅ Created ${entries.length} journal entries`);
    
    // Create glyph evolutions
    const glyphEvolutions = [];
    for (const glyphData of SAMPLE_GLYPH_EVOLUTIONS) {
      const meaningEvolution = glyphData.evolutions.map(evolution => ({
        date: new Date(Date.now() - evolution.days_ago * 24 * 60 * 60 * 1000).toISOString(),
        meaning: evolution.meaning,
        context: `Used in journal reflection`,
        trigger: evolution.trigger,
        confidence: evolution.confidence
      }));
      
      const evolutionData = {
        id: crypto.randomUUID(),
        user_id: userData.id,
        glyph: glyphData.glyph,
        meaning_evolution: meaningEvolution,
        usage_frequency: glyphData.evolutions.length + Math.floor(Math.random() * 10),
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };
      
      glyphEvolutions.push(evolutionData);
    }
    
    const { error: glyphsError } = await supabaseAdmin
      .from('glyph_evolutions')
      .insert(glyphEvolutions);
    
    if (glyphsError) {
      console.error('Error creating glyph evolutions:', glyphsError);
      return;
    }
    
    console.log(`✅ Created ${glyphEvolutions.length} glyph evolutions`);
    
    console.log('🎊 Database seeding completed successfully!');
    console.log(`\n📋 Summary:`);
    console.log(`   👤 Users: 1`);
    console.log(`   📝 Journal Entries: ${entries.length}`);
    console.log(`   🔮 Glyph Evolutions: ${glyphEvolutions.length}`);
    console.log(`   📧 Demo User Email: ${user.email}`);
    console.log(`\n🚀 Your prototype is ready with realistic data!`);
    
    return {
      user: userData,
      entries: entries.length,
      glyphs: glyphEvolutions.length
    };
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Utility function to clear all data (for testing)
export async function clearDatabase() {
  console.log('🧹 Clearing database...');
  
  try {
    await supabaseAdmin.from('glyph_evolutions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Database cleared');
  } catch (error) {
    console.error('❌ Clear failed:', error);
    throw error;
  }
}
