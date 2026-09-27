const fs = require('fs');
const code = fs.readFileSync('src/pages/PowerPlantSetup.tsx', 'utf-8');

let curly = 0;
let paren = 0;
let square = 0;

for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') curly++;
  if (code[i] === '}') curly--;
  if (code[i] === '(') paren++;
  if (code[i] === ')') paren--;
  if (code[i] === '[') square++;
  if (code[i] === ']') square--;
}

console.log('curly:', curly, 'paren:', paren, 'square:', square);
