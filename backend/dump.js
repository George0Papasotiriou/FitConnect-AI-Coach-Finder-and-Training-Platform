import fs from 'fs';
const qs = ['chat.ts', 'gamification.ts', 'notification.ts', 'session.ts', 'trainer.ts'];
let out = '';
qs.forEach(f => {
  const lines = fs.readFileSync('src/routes/' + f, 'utf-8').split('\n');
  lines.forEach((l, i) => {
    if (l.includes('DB_PREPARE_ERROR')) {
      out += f + ':' + (i+1) + '\n' + lines.slice(Math.max(0, i-1), i+3).join('\n') + '\n---\n';
    }
  });
});
fs.writeFileSync('errors.txt', out);
console.log('Wrote to errors.txt');
