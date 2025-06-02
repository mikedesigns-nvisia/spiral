#!/usr/bin/env node

import { seedDatabase, clearDatabase } from '../src/database/seed-data.js';

const command = process.argv[2];

async function main() {
  if (command === 'clear') {
    console.log('🧹 Clearing database...');
    await clearDatabase();
    console.log('✅ Database cleared successfully!');
  } else if (command === 'seed') {
    console.log('🌱 Seeding database with realistic data...');
    await seedDatabase();
  } else if (command === 'reset') {
    console.log('🔄 Resetting database (clear + seed)...');
    await clearDatabase();
    await seedDatabase();
  } else {
    console.log(`
🌀 The Reflector Codex Database Seeder

Usage:
  npm run seed        # Add realistic dummy data
  npm run seed:clear  # Clear all data  
  npm run seed:reset  # Clear and reseed

Commands:
  seed   - Populate database with 27 journal entries and glyph evolutions
  clear  - Remove all data from database
  reset  - Clear database and add fresh seed data

The seed data includes:
  📝 27 realistic journal entries spanning 3 months
  🔮 10 glyph evolutions with meaning development
  👤 1 demo user (demo@reflectorcodex.com)
  🎨 Rich tone classifications and sacred geometry
  ✨ Realistic progression of consciousness exploration
    `);
  }
}

main().catch(console.error);
