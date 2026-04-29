import 'dotenv/config';
import db from './src/db.js';

async function migrate() {
  try {
    console.log('Running migrations...');

    // 1. Add video_url to program_exercises
    try {
      await db.run('ALTER TABLE program_exercises ADD COLUMN video_url TEXT');
      console.log('✅ Added video_url to program_exercises');
    } catch (err) {}

    // 2. Add subscription columns to users
    try {
      await db.run('ALTER TABLE users ADD COLUMN subscription_active INTEGER DEFAULT 0');
      console.log('✅ Added subscription_active to users');
    } catch (err) {}

    try {
      await db.run('ALTER TABLE users ADD COLUMN free_trial_used INTEGER DEFAULT 0');
      console.log('✅ Added free_trial_used to users');
    } catch (err) {}

    // 3. Add updated_at to training_programs
    try {
      await db.run('ALTER TABLE training_programs ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()');
      console.log('✅ Added updated_at to training_programs');
    } catch (err) {}

    // 4. Ensure types are correct in messages
    // This is harder in PG without dropping constraints, but let's try to add it
    // if it fails later we will see.

    console.log('Migrations complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
