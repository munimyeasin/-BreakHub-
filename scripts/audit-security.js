#!/usr/bin/env node
/**
 * Break Hub API Security & Anti-Cheat Static Auditor
 * Validates score bounds, honeypot filters, input sanitization, and route protection.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passCount = 0;
let failCount = 0;

function check(title, condition, hint) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${title}`);
    passCount++;
  } else {
    console.log(`  \x1b[31m✖ FAIL\x1b[0m ${title} (${hint})`);
    failCount++;
  }
}

console.log('\n\x1b[36m🛡️  RUNNING BREAK HUB SECURITY & ANTI-CHEAT AUDIT...\x1b[0m\n');

// 1. Audit /api/scores/route.ts
const scoreRoutePath = path.join(ROOT, 'app', 'api', 'scores', 'route.ts');
if (fs.existsSync(scoreRoutePath)) {
  const scoreCode = fs.readFileSync(scoreRoutePath, 'utf8');
  check('Anti-Cheat: MAX_SCORE_LIMITS bounds enforcement', scoreCode.includes('MAX_SCORE_LIMITS'), 'Missing bounds map');
  check('Anti-Cheat: Rate-limiting / cooldown signature present', scoreCode.includes('checkRateLimit') || scoreCode.includes('RATE_LIMIT_WINDOW_MS'), 'Score submission rate limits');
  check('Data Integrity: Force-dynamic route export', scoreCode.includes("dynamic = 'force-dynamic'"), 'Must prevent static caching of scores');
  check('Username Moderation: Profanity censorship applied to gamer tags', scoreCode.includes('censorText'), 'Missing gamer tag censorship');
}

// 2. Audit /api/requests/route.ts
const requestRoutePath = path.join(ROOT, 'app', 'api', 'requests', 'route.ts');
if (fs.existsSync(requestRoutePath)) {
  const reqCode = fs.readFileSync(requestRoutePath, 'utf8');
  check('Bot Trap: Honeypot trap verification (hp_code)', reqCode.includes('hp_code'), 'Missing honeypot trap check');
  check('Content Moderation: Profanity censorship applied on input', reqCode.includes('censorText') || reqCode.includes('sanitizeGameRequest'), 'Missing profanity sanitization');
  check('Input Validation: Length bounds on title and description', reqCode.includes('title.trim().length') && reqCode.includes('description.trim().length'), 'Missing string length guards');
}

// 3. Audit Censor Library
const censorPath = path.join(ROOT, 'lib', 'censor.ts');
if (fs.existsSync(censorPath)) {
  const censorCode = fs.readFileSync(censorPath, 'utf8');
  check('Moderation Engine: Word boundary protection against false positives', censorCode.includes('\\b'), 'Must prevent false positives on classic/grass');
}

console.log(`\n\x1b[1mSummary: ${passCount} Passed, ${failCount} Failed\x1b[0m\n`);
if (failCount > 0) {
  process.exit(1);
}
