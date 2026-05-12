import db from './src/db.js';

async function check() {
  try {
    const tables = await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.map(t => t.table_name));

    const columns = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'program_exercises'");
    console.log('Columns in program_exercises:', columns);
    
    const msgColumns = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'messages'");
    console.log('Columns in messages:', msgColumns);
  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    process.exit();
  }
}

check();
