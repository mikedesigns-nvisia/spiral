-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom types
CREATE TYPE privacy_level AS ENUM ('private', 'mirror', 'collective', 'public');
CREATE TYPE cycle_type AS ENUM ('daily', 'weekly', 'lunar', 'seasonal', 'custom');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  mirror_depth INTEGER DEFAULT 3 CHECK (mirror_depth BETWEEN 0 AND 5),
  privacy_preferences JSONB DEFAULT '{"default_privacy": "mirror", "ai_analysis": true, "memory_resurfacing": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries table
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Laani symbolic architecture fields
  tone JSONB DEFAULT '{}', -- {mood: string, energy: string, sacred_geometry: object}
  glyphs TEXT[] DEFAULT '{}', -- symbolic tags/emojis
  
  -- AI and reflection fields
  embedding VECTOR(1536), -- OpenAI embeddings for semantic similarity
  references UUID[] DEFAULT '{}', -- linked entry IDs for recursive connections
  surfaced_at TIMESTAMPTZ[] DEFAULT '{}', -- history of when this entry was resurfaced
  
  -- Privacy and visibility
  privacy_level privacy_level DEFAULT 'mirror',
  
  -- Metadata
  word_count INTEGER DEFAULT 0,
  estimated_read_time INTEGER DEFAULT 0,
  
  CONSTRAINT valid_content_length CHECK (length(content) > 0 AND length(content) <= 50000)
);

-- Reflection cycles table for temporal patterns
CREATE TABLE IF NOT EXISTS reflection_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_type cycle_type NOT NULL,
  name TEXT NOT NULL,
  pattern JSONB NOT NULL, -- timing and trigger rules
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered TIMESTAMPTZ
);

-- Memory resurfacing events for tracking patterns
CREATE TABLE IF NOT EXISTS memory_surfaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  surfaced_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_type TEXT NOT NULL, -- 'temporal', 'semantic', 'symbolic', 'emotional', 'user_invoked'
  trigger_data JSONB DEFAULT '{}', -- metadata about what triggered the resurfacing
  resonance_score FLOAT DEFAULT 0.0 CHECK (resonance_score >= 0.0 AND resonance_score <= 1.0)
);

-- Symbolic evolution tracking
CREATE TABLE IF NOT EXISTS glyph_evolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  glyph TEXT NOT NULL,
  meaning_evolution JSONB DEFAULT '[]', -- array of {date, meaning, context}
  usage_frequency INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, glyph)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_glyphs ON entries USING GIN(glyphs);
CREATE INDEX IF NOT EXISTS idx_entries_tone ON entries USING GIN(tone);
CREATE INDEX IF NOT EXISTS idx_entries_embedding ON entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_memory_surfaces_user_entry ON memory_surfaces(user_id, entry_id);
CREATE INDEX IF NOT EXISTS idx_memory_surfaces_trigger ON memory_surfaces(trigger_type, surfaced_at);
CREATE INDEX IF NOT EXISTS idx_reflection_cycles_user_active ON reflection_cycles(user_id, active);
CREATE INDEX IF NOT EXISTS idx_glyph_evolutions_user_glyph ON glyph_evolutions(user_id, glyph);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE glyph_evolutions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Entry policies respecting privacy levels
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own entries" ON entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE USING (auth.uid() = user_id);

-- Reflection cycles policies
CREATE POLICY "Users can manage own cycles" ON reflection_cycles
  FOR ALL USING (auth.uid() = user_id);

-- Memory surfaces policies
CREATE POLICY "Users can view own memory surfaces" ON memory_surfaces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create memory surfaces" ON memory_surfaces
  FOR INSERT WITH CHECK (true); -- Will be restricted by application logic

-- Glyph evolution policies
CREATE POLICY "Users can manage own glyph evolutions" ON glyph_evolutions
  FOR ALL USING (auth.uid() = user_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflection_cycles_updated_at BEFORE UPDATE ON reflection_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glyph_evolutions_updated_at BEFORE UPDATE ON glyph_evolutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate word count and reading time
CREATE OR REPLACE FUNCTION calculate_entry_metadata()
RETURNS TRIGGER AS $$
BEGIN
    NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
    NEW.estimated_read_time = GREATEST(1, ROUND(NEW.word_count / 200.0)); -- 200 WPM average
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_entry_metadata_trigger BEFORE INSERT OR UPDATE ON entries
    FOR EACH ROW EXECUTE FUNCTION calculate_entry_metadata();
