import oracledb from 'oracledb'
import { parsePageId } from 'notion-utils'
import { query, withConn } from './db'

export type MenuItem = { title: string; href: string }
export type SiteSettings = {
  menu?: MenuItem[]
  font?: string
  brandColor?: string
  favicon?: string
  footer?: string
  customCss?: string
}
export type Site = {
  id: number
  slug: string
  customDomain: string | null
  rootPageId: string
  title: string | null
  ownerEmail: string
  settings: SiteSettings
}
export type Alias = { path: string; pageId: string }

type Row = {
  ID: number; SLUG: string; CUSTOM_DOMAIN: string | null; ROOT_PAGE_ID: string
  TITLE: string | null; OWNER_EMAIL: string; SETTINGS: string
}
const COLS = 'id, slug, custom_domain, root_page_id, title, owner_email, settings'
const toSite = (r: Row): Site => ({
  id: r.ID, slug: r.SLUG, customDomain: r.CUSTOM_DOMAIN, rootPageId: r.ROOT_PAGE_ID,
  title: r.TITLE, ownerEmail: r.OWNER_EMAIL, settings: JSON.parse(r.SETTINGS || '{}'),
})

export async function findSiteByHost(host: string): Promise<Site | null> {
  const h = host.toLowerCase().split(':')[0]
  // Local dev without Oracle: DEV_ROOT_PAGE=<notion page id> serves one site on every host.
  if (!process.env.ORACLE_CONNECT_STRING && process.env.DEV_ROOT_PAGE) {
    return { id: 0, slug: 'dev', customDomain: null, rootPageId: parsePageId(process.env.DEV_ROOT_PAGE, { uuid: true })!, title: null, ownerEmail: 'dev@localhost', settings: {} }
  }
  const base = process.env.BASE_DOMAIN?.toLowerCase()
  const slug = base && h.endsWith('.' + base) ? h.slice(0, -(base.length + 1)) : null
  const rows = await query<Row>(
    `SELECT ${COLS} FROM sites WHERE custom_domain = :h OR (:slug IS NOT NULL AND slug = :slug)`,
    { h, slug },
  )
  return rows[0] ? toSite(rows[0]) : null
}

export async function listSites(): Promise<Site[]> {
  return (await query<Row>(`SELECT ${COLS} FROM sites ORDER BY id`)).map(toSite)
}

export async function listAliases(siteId: number): Promise<Alias[]> {
  if (!process.env.ORACLE_CONNECT_STRING) return []
  const rows = await query<{ PATH: string; PAGE_ID: string }>(
    `SELECT path, page_id FROM page_aliases WHERE site_id = :siteId`, { siteId })
  return rows.map((r) => ({ path: r.PATH, pageId: r.PAGE_ID }))
}

export async function upsertSite(s: Omit<Site, 'id'> & { id?: number }, aliases: Alias[]) {
  await withConn(async (c) => {
    const binds = {
      slug: s.slug, dom: s.customDomain || null, root: s.rootPageId, title: s.title || null,
      email: s.ownerEmail, settings: JSON.stringify(s.settings),
    }
    let id = s.id
    if (id) {
      await c.execute(
        `UPDATE sites SET slug=:slug, custom_domain=:dom, root_page_id=:root, title=:title,
           owner_email=:email, settings=:settings WHERE id=:id`, { ...binds, id })
    } else {
      const r = await c.execute(
        `INSERT INTO sites (slug, custom_domain, root_page_id, title, owner_email, settings)
           VALUES (:slug, :dom, :root, :title, :email, :settings) RETURNING id INTO :id`,
        { ...binds, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } })
      id = (r.outBinds as unknown as { id: number[] }).id[0]
    }
    await c.execute(`DELETE FROM page_aliases WHERE site_id = :id`, { id })
    if (aliases.length) {
      await c.executeMany(
        `INSERT INTO page_aliases (site_id, path, page_id) VALUES (:id, :path, :pageId)`,
        aliases.map((a) => ({ id, path: a.path, pageId: a.pageId })))
    }
    await c.commit()
  })
}

export function deleteSite(id: number) {
  return query(`DELETE FROM sites WHERE id = :id`, { id })
}
