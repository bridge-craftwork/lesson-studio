/**
 * Lesson lint CLI (the CI check for lesson-library). Validates every `.md`
 * lesson under the given paths against Contract 1 (DSL) and Contract 4 (front
 * matter + taxonomy). Run with tsx:
 *
 *   npm run lint:lessons -- <dir-or-file>...
 *
 * Exits non-zero if any lesson has an error. "Page renders" is a separate,
 * browser-based check (scripts/print-pdf.mjs).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { validateLesson } from '../src/dsl/validate'

function walk(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((entry) => walk(join(path, entry)))
  }
  return path.endsWith('.md') ? [path] : []
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: lint-lessons <dir-or-file>...')
  process.exit(2)
}

const files = args.flatMap(walk)
let errors = 0
let warnings = 0

for (const file of files) {
  const issues = validateLesson(readFileSync(file, 'utf8'))
  if (issues.length === 0) {
    console.log(`  ok   ${file}`)
    continue
  }
  for (const issue of issues) {
    if (issue.severity === 'error') errors++
    else warnings++
    console.log(`  ${issue.severity === 'error' ? 'FAIL' : 'warn'} ${file}: ${issue.message}`)
  }
}

console.log(`\n${files.length} lesson(s) · ${errors} error(s) · ${warnings} warning(s)`)
process.exit(errors > 0 ? 1 : 0)
