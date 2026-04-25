import fs from 'fs';
const qs = ['chat.ts', 'gamification.ts', 'notification.ts', 'session.ts', 'trainer.ts'];

function processFile(file) {
  const p = 'src/routes/' + file;
  let text = fs.readFileSync(p, 'utf-8');
  let original = text;

  // We loop until there are no more 'db.prepare('
  while (true) {
    let index = text.indexOf('db.prepare(');
    if (index === -1) break;

    let before = text.substring(0, index);
    let rest = text.substring(index + 'db.prepare('.length);

    // find matching closing paren for prepare
    let parenCount = 1;
    let endIndex = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '(') parenCount++;
      if (rest[i] === ')') parenCount--;
      if (parenCount === 0) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) break; // malformed?

    let arg1 = rest.substring(0, endIndex);
    let afterPrepare = rest.substring(endIndex + 1);

    // Now look for .get(, .all( or .run(
    let match = afterPrepare.match(/^\s*\.(get|all|run)\s*\(/);
    if (!match) {
      console.log('UNEXPECTED:', afterPrepare.substring(0, 20));
      // Replace it with something so we don't infinite loop
      text = before + 'DB_PREPARE_ERROR(' + arg1 + ')' + afterPrepare;
      continue;
    }

    let methodName = match[1];
    let callStart = match[0].length;
    let callRest = afterPrepare.substring(callStart);

    let callParenCount = 1;
    let callEndIndex = -1;
    for (let i = 0; i < callRest.length; i++) {
        if (callRest[i] === '(') callParenCount++;
        if (callRest[i] === ')') callParenCount--;
        if (callParenCount === 0) {
          callEndIndex = i;
          break;
        }
    }

    let arg2 = callRest.substring(0, callEndIndex);
    let afterAll = callRest.substring(callEndIndex + 1);

    if (arg2.trim() === '') {
        text = before + `db.${methodName}(${arg1})` + afterAll;
    } else {
        text = before + `db.${methodName}(${arg1}, ${arg2})` + afterAll;
    }
  }

  fs.writeFileSync(p, text);
  console.log(file, original !== text ? 'MODIFIED' : 'UNCHANGED');
}

qs.forEach(processFile);
