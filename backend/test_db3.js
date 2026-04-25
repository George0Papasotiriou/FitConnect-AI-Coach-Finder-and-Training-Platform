import pg from 'pg';
const client = new pg.Client({
  connectionString: 'postgresql://postgres:INCVrYkoWpipIqxGTOqoDLiCxvebQvyz@shuttle.proxy.rlwy.net:27563/railway',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => { 
    console.log('Connected to DB!'); 
    process.exit(0); 
  })
  .catch(e => { 
    console.error('Failed to connect to DB:', e.message); 
    process.exit(1); 
  });
