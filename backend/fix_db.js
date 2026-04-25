import fs from 'fs';
import path from 'path';

const routesDir = 'c:/Users/Admin/Downloads/Coach APP/backend/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace db.prepare('...').get(...) -> db.get('...', ...)
  content = content.replace(/db\.prepare\(([^)]+)\)\.get\(([^)]*)\)/g, (match, p1, p2) => {
    return p2.trim() ? `db.get(${p1}, ${p2})` : `db.get(${p1})`;
  });

  // Replace db.prepare('...').all(...) -> db.all('...', ...)
  content = content.replace(/db\.prepare\(([^)]+)\)\.all\(([^)]*)\)/g, (match, p1, p2) => {
    return p2.trim() ? `db.all(${p1}, ${p2})` : `db.all(${p1})`;
  });

  // Replace db.prepare('...').run(...) -> db.run('...', ...)
  content = content.replace(/db\.prepare\(([^)]+)\)\.run\(([^)]*)\)/g, (match, p1, p2) => {
    return p2.trim() ? `db.run(${p1}, ${p2})` : `db.run(${p1})`;
  });

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
