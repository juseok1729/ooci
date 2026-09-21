import type { ExtendedRecordMap } from 'notion-types'
import { getBlockTitle, getBlockValue, parsePageId } from 'notion-utils'
import type { Alias, MenuItem } from './sites'

/** URL path segments -> notion page id. '' = root, alias path, or a notion id/slug-id. */
export function resolvePageId(segments: string[], rootPageId: string, aliases: Alias[]): string | null {
  const path = segments.map(decodeURIComponent).join('/')
  if (!path) return rootPageId
  const alias = aliases.find((a) => a.path === path)
  if (alias) return alias.pageId
  return parsePageId(segments[segments.length - 1], { uuid: true }) ?? null
}

/** notion page id -> site-relative href (alias if configured, else /<uuid>). */
export function pageHref(pageId: string, rootPageId: string, aliases: Alias[]): string {
  const id = parsePageId(pageId, { uuid: true }) ?? pageId
  if (id === rootPageId) return '/'
  const alias = aliases.find((a) => a.pageId === id)
  return '/' + (alias ? alias.path : id)
}

/** Default menu = child pages of the root page (looking through column layouts). */
export function defaultMenu(root: ExtendedRecordMap, rootPageId: string, aliases: Alias[]): MenuItem[] {
  const walk = (id: string): MenuItem[] => {
    const b = getBlockValue(root.block[id])
    if (!b) return []
    if (b.type === 'page') return [{ title: getBlockTitle(b, root) || 'Untitled', href: pageHref(id, rootPageId, aliases) }]
    if (b.type === 'column_list' || b.type === 'column') return (b.content ?? []).flatMap(walk)
    return []
  }
  return (getBlockValue(root.block[rootPageId])?.content ?? []).flatMap(walk)
}

/** Notion date property -> "YYYY/MM/DD HH:mm" (oopy style). ponytail: ignores Notion's per-property date_format. */
export function formatNotionDate(d: { start_date?: string; start_time?: string; end_date?: string; end_time?: string } | undefined): string | null {
  if (!d?.start_date) return null
  const f = (date: string, time?: string) => date.replaceAll('-', '/') + (time ? ` ${time}` : '')
  return f(d.start_date, d.start_time) + (d.end_date ? ` → ${f(d.end_date, d.end_time)}` : '')
}

export const TIME_ZONE = 'Asia/Seoul'
const timeFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
/** created_time / last_edited_time (ms epoch) -> "YYYY/MM/DD HH:mm" in TIME_ZONE (fixed so SSR and client agree). */
export function formatNotionTime(ms: number): string {
  return timeFmt.format(new Date(ms)).replaceAll('-', '/')
}

/**
 * Page icons set to a workspace custom emoji arrive as `notion://custom_emoji/<space>/<id>`, which react-notion-x
 * would wrap in an image-proxy URL that 404s. The page chunk carries a `custom_emoji` table with the real image URL,
 * so rewrite icons in place and expose the id->url map react-notion-x uses for inline ("ce") emojis.
 * Returns icons still unresolved as [spaceId, emojiId] (rows loaded via collection queries lack their records).
 */
export function resolveCustomEmojis(map: ExtendedRecordMap): [string, string][] {
  const table = (map as unknown as { custom_emoji?: Record<string, unknown> }).custom_emoji ?? {}
  const urls = Object.fromEntries(Object.entries(table).map(([id, rec]) => [id, (getBlockValue(rec as never) as unknown as { url?: string })?.url ?? null]))
  map.custom_emojis = { ...map.custom_emojis, ...urls }
  const missing: [string, string][] = []
  for (const rec of Object.values(map.block)) {
    const b = getBlockValue(rec)
    const icon = b?.format?.page_icon
    if (!b || !icon?.startsWith('notion://custom_emoji/')) continue
    const [spaceId, id] = icon.split('/').slice(-2)
    if (urls[id]) b.format.page_icon = urls[id]
    else missing.push([spaceId, id])
  }
  return missing
}
