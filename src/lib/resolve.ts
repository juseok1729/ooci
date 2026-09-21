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
