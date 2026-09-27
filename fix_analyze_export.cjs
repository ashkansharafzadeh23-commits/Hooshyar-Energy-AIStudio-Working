const fs = require('fs');
let code = fs.readFileSync('api/analyze.js', 'utf8');

// The file currently has:
// export default async function handler(req, res) {
//   ...
//   export async function runRuleEngine(body) {
//   ...
//   }
//   ...
// }

// Let's find the start of `export async function runRuleEngine(body) {`
const runRuleIdx = code.indexOf('export async function runRuleEngine(body) {');

// Find the end of `runRuleEngine` which is `return { engineResult };\n}`
const endRuleIdx = code.indexOf('return { engineResult };\n}\n') + 'return { engineResult };\n}\n'.length;

const ruleEngineCode = code.substring(runRuleIdx, endRuleIdx);

// Remove the ruleEngineCode from its current position
code = code.substring(0, runRuleIdx) + code.substring(endRuleIdx);

// Place ruleEngineCode BEFORE `export default async function handler(req, res) {`
const handlerIdx = code.indexOf('export default async function handler(req, res) {');
code = code.substring(0, handlerIdx) + ruleEngineCode + '\n' + code.substring(handlerIdx);

fs.writeFileSync('api/analyze.js', code);
