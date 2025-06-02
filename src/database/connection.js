import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create Supabase clients
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Service role client for admin operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database health check
export async function checkDatabaseHealth() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Database health check failed:', error);
      return false;
    }
    
    console.log('✅ Database connection healthy');
    return true;
  } catch (err) {
    console.error('Database health check error:', err);
    return false;
  }
}

// Execute raw SQL (admin only)
export async function executeSQL(sql, params = []) {
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
  if (!isHealthy) {
    throw new Error('Database connection failed');
  }
  
  console.log('🎊 Database initialized successfully');
  return true;
}
