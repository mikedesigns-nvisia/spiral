import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Check if we should use mock mode
const shouldUseMockMode = (
  !process.env.SUPABASE_URL || 
  !process.env.SUPABASE_ANON_KEY || 
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_URL.includes('your_supabase') ||
  process.env.OPENAI_API_KEY?.includes('your_openai') ||
  process.env.NODE_ENV === 'mock'
);

let supabase, supabaseAdmin;

if (shouldUseMockMode) {
  console.log('🎭 MOCK MODE ENABLED - Using simulated database');
  console.log('   → No external APIs required');
  console.log('   → 5 realistic journal entries loaded');
  console.log('   → 3 glyph evolutions available');
  console.log('   → All endpoints functional');
  console.log('   → Ready for immediate demonstration');
  
  // Import and use mock connections
  const { supabase: mockSupabase, supabaseAdmin: mockSupabaseAdmin } = await import('../mock/mock-connection.js');
  supabase = mockSupabase;
  supabaseAdmin = mockSupabaseAdmin;
} else {
  // Validate required environment variables for real mode
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Create real Supabase clients
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    }
  );

  supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  console.log('🔗 Connected to Supabase database');
}

export { supabase, supabaseAdmin };

// Database health check
export async function checkDatabaseHealth() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error && !shouldUseMockMode) {
      console.error('Database health check failed:', error);
      return false;
    }
    
    console.log('✅ Database connection healthy');
    return true;
  } catch (err) {
    if (!shouldUseMockMode) {
      console.error('Database health check error:', err);
      return false;
    }
    // In mock mode, always return healthy
    console.log('✅ Mock database healthy');
    return true;
  }
}

// Execute raw SQL (admin only) - disabled in mock mode
export async function executeSQL(sql, params = []) {
  if (shouldUseMockMode) {
    console.log('📝 Mock SQL execution:', sql);
    return { success: true, message: 'Mock SQL executed' };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: sql,
      params: params
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('SQL execution error:', err);
    throw err;
  }
}

// Helper function to get user from JWT token
export async function getUserFromToken(token) {
  if (shouldUseMockMode) {
    // Return mock user for demo purposes
    return {
      id: 'demo-user-id',
      email: 'demo@reflectorcodex.com',
      user_metadata: { full_name: 'Demo User' }
    };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    return user;
  } catch (err) {
    console.error('Token validation error:', err);
    throw err;
  }
}

// Initialize database connection
export async function initializeDatabase() {
  console.log('🔄 Initializing database connection...');
  
  const isHealthy = await checkDatabaseHealth();
  if (!isHealthy && !shouldUseMockMode) {
    throw new Error('Database connection failed');
  }
  
  if (shouldUseMockMode) {
    console.log('🎊 Mock database initialized successfully');
    console.log('💡 To use real APIs, update your .env file with actual credentials');
  } else {
    console.log('🎊 Database initialized successfully');
  }
  
  return true;
}
