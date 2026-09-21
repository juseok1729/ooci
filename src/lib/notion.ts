import { NotionAPI } from 'notion-client'
import type { ExtendedRecordMap } from 'notion-types'
import { TIME_ZONE, resolveCustomEmojis } from './resolve'

const notion = new NotionAPI({ userTimeZone: TIME_ZONE })
const TTL = Number(process.env.PAGE_TTL ?? 60) * 1000

type Entry = { at: number; data: Promise<ExtendedRecordMap> }
const g = globalThis as { __ooci_pages?: Map<string, Entry> }
const cache = (g.__ooci_pages ??= new Map())

// ponytail: in-process cache; move to an Oracle PAGE_CACHE table when running >1 replica.
export function getPage(pageId: string): Promise<ExtendedRecordMap> {
  const prev = cache.get(pageId)
  const now = Date.now()
  if (prev && now - prev.at < TTL) return prev.data
  const data = notion.getPage(pageId).then(withCustomEmojis).catch((err) => {
    if (prev) cache.set(pageId, prev)
    else cache.delete(pageId)
    throw err
  })
  cache.set(pageId, { at: now, data })
  return prev ? prev.data : data // stale-while-revalidate
}

async function withCustomEmojis(m: ExtendedRecordMap) {
  const missing = resolveCustomEmojis(m)
  if (!missing.length) return m
  // Row pages from collection queries reference emojis whose records are not in the page chunk; fetch them by pointer (works without auth).
  const r = await notion.fetch<{ recordMap: { custom_emoji?: Record<string, unknown> } }>({
    endpoint: 'syncRecordValuesMain',
    body: { requests: missing.map(([spaceId, id]) => ({ pointer: { table: 'custom_emoji', id, spaceId }, version: -1 })) },
  }).catch((e) => (console.error('custom_emoji fetch failed', e), null))
  if (r?.recordMap.custom_emoji) {
    const mm = m as unknown as { custom_emoji?: Record<string, unknown> }
    mm.custom_emoji = { ...mm.custom_emoji, ...r.recordMap.custom_emoji }
    resolveCustomEmojis(m)
  }
  return m
}

export function purgePages() {
  cache.clear()
}
