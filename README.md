# The Reflector Codex - Backend API

A recursive journaling application backend built with Express.js, Supabase, and OpenAI, designed for 2026 with Laani symbolic architecture integration.

## Overview

The Reflector Codex backend provides a sophisticated API for recursive journaling that:

- **Processes journal entries** with AI-powered tone classification and symbolic glyph extraction
- **Surfaces memories** through multi-dimensional similarity algorithms (semantic, temporal, symbolic, emotional)
- **Generates reflections** using consciousness-aware AI that mirrors rather than prescribes
- **Supports real-time updates** via WebSocket connections
- **Ensures privacy** through granular user controls and row-level security

## Features

### Core Functionality
- ✨ **Journal Entry Management** - Create, read, update, delete entries with full CRUD operations
- 🧠 **AI-Powered Analysis** - Automatic tone classification, glyph extraction, and embedding generation
- 🌊 **Memory Resurfacing** - Intelligent surfacing of past entries based on patterns and cycles
- 🪞 **Reflective Intelligence** - AI-generated insights that mirror inner patterns
- 🔒 **Privacy Controls** - User sovereignty over data access and AI analysis depth
- 🌐 **Real-time Updates** - WebSocket support for live reflection updates

### Laani Symbolic Architecture Support
- **Presence Awareness** - Tone and energy classification for UI responsiveness
- **Energetic Reciprocity** - Dynamic themes based on emotional states
- **Morphogenetic Glyphs** - Symbolic tag extraction and evolution tracking
- **Sacred Geometry** - Geometric form associations for spiral timelines
- **Recursive Memory** - Cyclical pattern recognition and temporal resonance

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js with async/await
- **Database**: Supabase (PostgreSQL with vector embeddings)
- **AI Services**: OpenAI GPT-4 and text-embedding-3-small
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: WebSocket server for live updates
- **Validation**: Zod for schema validation
- **Security**: Helmet, CORS, rate limiting

## Quick Start

### Prerequisites

- Node.js 18+ 
- Supabase project with vector extension enabled
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reflector-codex-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```

4. **Set up the database**
   
   Run the database migration in your Supabase SQL editor:
   ```bash
   # Copy and execute the contents of src/database/schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001` and WebSocket at `ws://localhost:3002`.

## API Endpoints

### Health & Info
- `GET /` - API information and status
- `GET /health` - Health check with service status

### Journal Entries
- `GET /api/entries` - List user's journal entries (with pagination, filtering)
- `POST /api/entries` - Create new journal entry with AI processing
- `GET /api/entries/:id` - Get specific journal entry
- `PUT /api/entries/:id` - Update journal entry (triggers AI reprocessing if content changes)
- `DELETE /api/entries/:id` - Delete journal entry

### Memory & Reflection
- `GET /api/entries/resurface` - Trigger memory resurfacing based on patterns
- `POST /api/entries/:id/reflect` - Generate AI reflection on specific entry

## Database Schema

### Core Tables
- **users** - User profiles with mirror depth and privacy preferences
- **entries** - Journal entries with content, tone, glyphs, embeddings, and references
- **reflection_cycles** - Temporal patterns for memory resurfacing
- **memory_surfaces** - Log of memory resurfacing events
- **glyph_evolutions** - Tracking symbolic glyph usage and meaning evolution

### Key Features
- **Vector embeddings** for semantic similarity search
- **JSONB fields** for flexible tone and glyph storage
- **Row-level security** for user data protection
- **Automatic triggers** for word count and timestamp updates

## AI Processing Pipeline

### 1. Entry Processing
```javascript
// Tone Classification
{
  "mood": "contemplative",
  "energy": "flowing", 
  "sacred_geometry": {
    "primary_shape": "spiral",
    "flow_direction": "inward"
  },
  "resonance_frequency": 0.7
}

// Glyph Extraction
["🌊", "🌀", "✨", "🌙", "🍃"]

// Embedding Generation
[0.1234, -0.5678, ...] // 1536-dimension vector
```

### 2. Memory Resurfacing
Multi-dimensional similarity scoring:
- **Semantic (35%)** - Vector embedding cosine similarity
- **Tonal (25%)** - Mood and energy matching
- **Symbolic (20%)** - Shared glyph intersection
- **Temporal (20%)** - Cyclical pattern recognition

### 3. Reflection Generation
Consciousness-aware AI that:
- Mirrors rather than prescribes
- Identifies patterns and themes
- Provides symbolic interpretations
- Offers gentle invitations for exploration

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3002');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_jwt_token'
}));

// Receive reflection updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

### Message Types
- `auth` - Authenticate connection
- `ping/pong` - Keep-alive
- `reflection_update` - Real-time AI processing results
- `memory_surface` - New memories surfaced

## Security Features

- **JWT Authentication** - Supabase Auth integration
- **Row-Level Security** - Database-level user isolation
- **CORS Protection** - Configurable allowed origins
- **Rate Limiting** - Per-operation throttling
- **Input Validation** - Zod schema validation
- **Helmet Security** - Standard security headers

## Privacy Controls

Users can control:
- **Mirror Depth** (0-5) - AI analysis access level
- **Privacy Levels** - Entry visibility (private, mirror, collective, public)
- **AI Analysis** - Enable/disable automatic processing
- **Memory Resurfacing** - Control temporal pattern triggers

## Development

### Project Structure
```
src/
├── database/
│   ├── connection.js    # Supabase client setup
│   └── schema.sql       # Database schema and migrations
├── middleware/
│   └── auth.js         # Authentication and permissions
├── routes/
│   └── entries.js      # Journal entry API routes
├── services/
│   └── ReflectiveAgent.js # AI processing engine
└── server.js           # Main application server
```

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm test` - Run test suite

### Environment Variables
See `.env.example` for all available configuration options.

## Deployment

### Supabase Setup
1. Create new Supabase project
2. Enable vector extension: `CREATE EXTENSION vector;`
3. Run the schema from `src/database/schema.sql`
4. Configure Row Level Security policies
5. Set up authentication providers as needed

### Production Deployment
1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set up SSL/TLS termination
4. Configure monitoring and logging
5. Set appropriate rate limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Architecture Philosophy

The Reflector Codex embodies:

- **Consciousness-First Design** - Technology that honors human awareness
- **Recursive Patterns** - Self-referential memory and learning systems
- **Symbolic Intelligence** - Archetypal pattern recognition
- **Temporal Harmony** - Cyclical and seasonal attunement
- **User Sovereignty** - Complete control over personal data and AI interaction

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ by Architect's Relay & Claude for the future of conscious technology.
