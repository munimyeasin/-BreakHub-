#!/usr/bin/env node
/**
 * Turbo Conventional Changelog & Release Generator
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const log = execSync('git log --pretty=format:"%h - %s (%cr)" -n 15', { encoding: 'utf8' });
  const entries = log.split('\n');

  console.log('\n\x1b[35m🚀 BREAK HUB AUTOMATED CHANGELOG (Recent 15 Commits)\x1b[0m\n');
  entries.forEach(line => {
    if (line.includes('feat(')) {
      console.log(`  \x1b[32m[FEATURE]\x1b[0m ${line}`);
    } else if (line.includes('fix(')) {
      console.log(`  \x1b[33m[BUGFIX]\x1b[0m  ${line}`);
    } else {
      console.log(`  \x1b[36m[UPDATE]\x1b[0m  ${line}`);
    }
  });
  console.log('\n');
} catch (e) {
  console.error('Failed to generate changelog from git log:', e.message);
}
