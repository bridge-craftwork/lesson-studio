import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const S = process.argv[2]
const lesson = process.argv[3]
const md = readFileSync(lesson,'utf8')
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1700,height:1050}, deviceScaleFactor:2 })
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto('http://localhost:5173/', { waitUntil:'networkidle' })
await p.evaluate((m)=>localStorage.setItem('lesson-studio:drafts:v1',
  JSON.stringify([{id:'t1',title:'test',markdown:m,updatedAt:Date.now()}])), md)
await p.reload({ waitUntil:'networkidle' })
await p.waitForTimeout(900)
await p.click('.drafts summary')
await p.click('.drafts__restore')
await p.waitForTimeout(900)
await p.click('.studio__toggle')
await p.waitForTimeout(1800)
console.log('page count:', await p.locator('.pp__count').innerText())
console.log('columns:', await p.locator('.pp__cols').innerText())
console.log('page boxes:', await p.locator('.pp__page').count())
const cols = await p.locator('.pp__flow .ProseMirror').first().evaluate(el => getComputedStyle(el).columnCount)
console.log('computed column-count in preview:', cols)
console.log('errors:', errs.slice(0,3))
await p.screenshot({ path: S+'/preview-nmf.png' })
await b.close()
