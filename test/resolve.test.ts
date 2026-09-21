import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolvePageId, pageHref } from '../src/lib/resolve.ts'

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
