import express from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../database/connection.js';
import { authenticateUser, checkPermissions, rateLimitByOperation } from '../middleware/auth.js';
import ReflectiveAgent from '../services/ReflectiveAgent.js';

const router = express.Router();
const reflectiveAgent = new ReflectiveAgent();

// Validation schemas
const createEntrySchema = z.object({
  content: z.string().min(1).max(50000),
  privacy_level: z.enum(['private', 'mirror', 'collective', 'public']).optional(),
  references: z.array(z.string().uuid()).optional()
});

const updateEntrySchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  privacy_level: z.enum(['private', 'mirror', 'collective', 'public']).optional(),
  references: z.array(z.string().uuid()).optional()
});

/**
 * GET /api/entries/resurface
 * Trigger memory resurfacing based on patterns and cycles
 * NOTE: This route must come before /:id to avoid conflicts
 */
router.get('/resurface',
  authenticateUser,
  rateLimitByOperation('memory_resurface'),
  async (req, res) => {
    try {
      const { triggers = {} } = req.query;

      console.log(`🌊 Resurfacing memories for user ${req.user.id}`);
      
      const surfacedMemories = await reflectiveAgent.surfaceMemories(
        req.user.id,
        typeof triggers === 'string' ? JSON.parse(triggers) : triggers
      );

      res.json({
        surfaced_memories: surfacedMemories,
        count: surfacedMemories.length,
        surfaced_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Memory resurfacing error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to surface memories'
      });
    }
  }
);

/**
 * GET /api/entries
 * Fetch user's journal entries with pagination and filtering
 */
router.get('/', 
  authenticateUser,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'created_at',
        order = 'desc',
        search,
        glyphs,
        mood,
        from_date,
        to_date
      } = req.query;

      // Build query
      let query = supabase
        .from('entries')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          tone,
          glyphs,
          references,
          surfaced_at,
          privacy_level,
          word_count,
          estimated_read_time
        `)
        .eq('user_id', req.user.id);

      // Apply filters
      if (search) {
        query = query.textSearch('content', search);
      }

      if (glyphs) {
        const glyphArray = Array.isArray(glyphs) ? glyphs : [glyphs];
        query = query.overlaps('glyphs', glyphArray);
      }

      if (mood) {
        query = query.eq('tone->>mood', mood);
      }

      if (from_date) {
        query = query.gte('created_at', from_date);
      }

      if (to_date) {
        query = query.lte('created_at', to_date);
      }

      // Apply sorting and pagination
      const offset = (page - 1) * limit;
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: entries, error, count } = await query;

      if (error) {
        console.error('Error fetching entries:', error);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch entries'
        });
      }

      res.json({
        entries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get entries error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to retrieve entries'
      });
    }
  }
);

/**
 * POST /api/entries
 * Create a new journal entry with AI processing
 */
router.post('/',
  authenticateUser,
  rateLimitByOperation('create_entry'),
  async (req, res) => {
    try {
      // Validate request body
      const validationResult = createEntrySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid entry data',
          details: validationResult.error.errors
        });
      }

      const { content, privacy_level = 'mirror', references = [] } = validationResult.data;

      // Create initial entry
      const { data: entry, error: insertError } = await supabase
        .from('entries')
        .insert({
          user_id: req.user.id,
          content,
          privacy_level,
          references
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating entry:', insertError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to create entry'
        });
      }

      // Process entry with AI (asynchronous)
      try {
        console.log(`🚀 Starting AI processing for entry ${entry.id}`);
        const aiAnalysis = await reflectiveAgent.processEntry(entry);

        // Update entry with AI analysis
        const { error: updateError } = await supabaseAdmin
          .from('entries')
          .update({
            tone: aiAnalysis.tone,
            glyphs: aiAnalysis.glyphs,
            embedding: aiAnalysis.embedding,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (updateError) {
          console.error('Error updating entry with AI analysis:', updateError);
        } else {
          console.log(`✨ AI processing completed for entry ${entry.id}`);
        }

        // Return enhanced entry data
        res.status(201).json({
          entry: {
            ...entry,
            tone: aiAnalysis.tone,
            glyphs: aiAnalysis.glyphs,
            echoes: aiAnalysis.echoes
          },
          reflection: {
            echoes: aiAnalysis.echoes,
            processed_at: aiAnalysis.processed_at
          }
        });

      } catch (aiError) {
        console.error('AI processing error:', aiError);
        // Return entry without AI enhancement
        res.status(201).json({
          entry,
          reflection: {
            echoes: [],
            error: 'AI processing failed, entry saved without analysis'
          }
        });
      }

    } catch (error) {
      console.error('Create entry error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to create entry'
      });
    }
  }
);

/**
 * GET /api/entries/:id
 * Get a specific journal entry
 */
router.get('/:id',
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: entry, error } = await supabase
        .from('entries')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          tone,
          glyphs,
          references,
          surfaced_at,
          privacy_level,
          word_count,
          estimated_read_time
        `)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Entry not found',
            message: 'The requested entry does not exist'
          });
        }
        
        console.error('Error fetching entry:', error);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch entry'
        });
      }

      res.json({ entry });

    } catch (error) {
      console.error('Get entry error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to retrieve entry'
      });
    }
  }
);

/**
 * PUT /api/entries/:id
 * Update a journal entry
 */
router.put('/:id',
  authenticateUser,
  rateLimitByOperation('update_entry'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate request body
      const validationResult = updateEntrySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid update data',
          details: validationResult.error.errors
        });
      }

      const updateData = validationResult.data;

      // Check if entry exists and belongs to user
      const { data: existingEntry, error: fetchError } = await supabase
        .from('entries')
        .select('id, content')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Entry not found',
            message: 'The requested entry does not exist'
          });
        }
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch entry'
        });
      }

      // Update entry
      const { data: updatedEntry, error: updateError } = await supabase
        .from('entries')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating entry:', updateError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to update entry'
        });
      }

      // If content was updated, reprocess with AI
      if (updateData.content && updateData.content !== existingEntry.content) {
        try {
          const aiAnalysis = await reflectiveAgent.processEntry(updatedEntry);

          // Update with new AI analysis
          await supabaseAdmin
            .from('entries')
            .update({
              tone: aiAnalysis.tone,
              glyphs: aiAnalysis.glyphs,
              embedding: aiAnalysis.embedding
            })
            .eq('id', id);

          res.json({
            entry: {
              ...updatedEntry,
              tone: aiAnalysis.tone,
              glyphs: aiAnalysis.glyphs
            },
            reflection: {
              echoes: aiAnalysis.echoes,
              reprocessed: true
            }
          });

        } catch (aiError) {
          console.error('AI reprocessing error:', aiError);
          res.json({
            entry: updatedEntry,
            reflection: {
              error: 'AI reprocessing failed'
            }
          });
        }
      } else {
        res.json({ entry: updatedEntry });
      }

    } catch (error) {
      console.error('Update entry error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to update entry'
      });
    }
  }
);

/**
 * DELETE /api/entries/:id
 * Delete a journal entry
 */
router.delete('/:id',
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);

      if (error) {
        console.error('Error deleting entry:', error);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to delete entry'
        });
      }

      res.json({
        message: 'Entry deleted successfully',
        deleted_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Delete entry error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to delete entry'
      });
    }
  }
);



/**
 * POST /api/entries/:id/reflect
 * Get AI reflection on a specific entry
 */
router.post('/:id/reflect',
  authenticateUser,
  checkPermissions(2), // Requires deeper mirror access
  rateLimitByOperation('ai_reflection'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { prompt } = req.body;

      // Fetch the entry
      const { data: entry, error } = await supabase
        .from('entries')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Entry not found',
            message: 'The requested entry does not exist'
          });
        }
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to fetch entry'
        });
      }

      // Generate AI reflection
      const reflection = await reflectiveAgent.generateReflection(entry, prompt);

      res.json({
        reflection,
        entry_id: id,
        reflected_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('AI reflection error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to generate reflection'
      });
    }
  }
);

export default router;
