const fs = require('fs');
const content = fs.readFileSync('c:/Users/Owner/OneDrive/Desktop/capstone project 1/frontend/src/pages/Dashboard.jsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{') braceCount++;
  else if (char === '}') braceCount--;
  else if (char === '(') parenCount++;
  else if (char === ')') parenCount--;
  else if (char === '[') bracketCount++;
  else if (char === ']') bracketCount--;

  if (braceCount < 0) console.log(`Extra } at char ${i}`);
  if (parenCount < 0) console.log(`Extra ) at char ${i}`);
  if (bracketCount < 0) console.log(`Extra ] at char ${i}`);
}

console.log(`Final counts: Braces: ${braceCount}, Parens: ${parenCount}, Brackets: ${bracketCount}`);
