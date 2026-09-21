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
  const data = notion.getPage(pageId).then((m) => (resolveCustomEmojis(m), m)).catch((err) => {
    if (prev) cache.set(pageId, prev)
    else cache.delete(pageId)
    throw err
  })
  cache.set(pageId, { at: now, data })
  return prev ? prev.data : data // stale-while-revalidate
}

export function purgePages() {
  cache.clear()
}
