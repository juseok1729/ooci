import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolvePageId, pageHref, formatNotionDate, formatNotionTime, resolveCustomEmojis, hideEmptyGroups } from '../src/lib/resolve.ts'

const root = '4c1be6f5-1f1e-487b-9ecd-95ef30850f20'
const aliases = [{ path: 'blog/first', pageId: '11dc52d7-4aec-45c9-8d8d-9639453c1dde' }]

test('resolvePageId', () => {
  assert.equal(resolvePageId([], root, aliases), root)
  assert.equal(resolvePageId(['blog', 'first'], root, aliases), aliases[0].pageId)
  assert.equal(resolvePageId(['My-Post-4c1be6f51f1e487b9ecd95ef30850f20'], root, aliases), root)
  assert.equal(resolvePageId(['nope'], root, aliases), null)
})

test('pageHref', () => {
  assert.equal(pageHref(root, root, aliases), '/')
  assert.equal(pageHref('11dc52d74aec45c98d8d9639453c1dde', root, aliases), '/blog/first')
  assert.equal(pageHref('8db7d15e-9ce5-4eb0-9bfb-3ef48679755c', root, aliases), '/8db7d15e-9ce5-4eb0-9bfb-3ef48679755c')
})

test('formatNotionDate', () => {
  assert.equal(formatNotionDate({ start_date: '2026-09-20', start_time: '20:26' }), '2026/09/20 20:26')
  assert.equal(formatNotionDate({ start_date: '2026-09-20', end_date: '2026-09-21' }), '2026/09/20 → 2026/09/21')
  assert.equal(formatNotionDate(undefined), null)
})

test('formatNotionTime', () => {
  assert.equal(formatNotionTime(Date.UTC(2026, 8, 20, 11, 26)), '2026/09/20 20:26') // 11:26Z = 20:26 KST
})

test('resolveCustomEmojis', () => {
  const map = {
    block: { p1: { value: { id: 'p1', type: 'page', format: { page_icon: 'notion://custom_emoji/space/e1' } } }, p2: { value: { id: 'p2', type: 'page', format: { page_icon: '🙂' } } }, p3: { value: { id: 'p3', type: 'page', format: { page_icon: 'notion://custom_emoji/space/e2' } } } },
    custom_emoji: { e1: { value: { value: { id: 'e1', url: 'https://img/e1.png' } } } },
  } as never
  const missing = resolveCustomEmojis(map)
  assert.deepEqual(missing, [['space', 'e2']])
  const m = map as { block: Record<string, { value: { format: { page_icon: string } } }>; custom_emojis: Record<string, string | null> }
  assert.equal(m.block.p1.value.format.page_icon, 'https://img/e1.png')
  assert.equal(m.block.p2.value.format.page_icon, '🙂')
  assert.deepEqual(m.custom_emojis, { e1: 'https://img/e1.png' })
})

test('hideEmptyGroups', () => {
  const groups = [
    { value: { type: 'select', value: 'Empty' }, hidden: false },
    { value: { type: 'select', value: 'Full' }, hidden: false },
    { value: { type: 'select' }, hidden: false },
  ]
  const query = { 'results:select:Empty': { blockIds: [] }, 'results:select:Full': { blockIds: ['a', 'b'] }, 'results:select:uncategorized': { blockIds: [] } }
  const map = { collection_view: { v1: { value: { id: 'v1', format: { collection_groups: groups } } } }, collection_query: { c1: { v1: query } } } as never
  hideEmptyGroups(map)
  assert.deepEqual(groups.map((g) => g.hidden), [true, false, true])
  assert.equal((query['results:select:Full'] as { total?: number }).total, 2)
})
