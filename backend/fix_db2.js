import fs from 'fs';
import path from 'path';

const routesDir = 'c:/Users/Admin/Downloads/Coach APP/backend/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace multi-line or any db.prepare(SQL).get(PARAMS)
  // We use [\s\S]*? to match across newlines inside parentheses
  content = content.replace(/db\.prepare\(([\s\S]*?)\)\.get\(([\s\S]*?)\)/g, (m, sql, params) => params.trim() ? `db.get(${sql}, ${params})` : `db.get(${sql})`);
  content = content.replace(/db\.prepare\(([\s\S]*?)\)\.all\(([\s\S]*?)\)/g, (m, sql, params) => params.trim() ? `db.all(${sql}, ${params})` : `db.all(${sql})`);
  content = content.replace(/db\.prepare\(([\s\S]*?)\)\.run\(([\s\S]*?)\)/g, (m, sql, params) => params.trim() ? `db.run(${sql}, ${params})` : `db.run(${sql})`);

  fs.writeFileSync(filePath, content);
  console.log(`Updated multi ${file}`);
});
