import { headers } from 'next/headers'
import { findSiteByHost, listAliases } from '@/lib/sites'
import { searchPages } from '@/lib/notion'
import { pageHref } from '@/lib/resolve'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!q) return Response.json([])
  const site = await findSiteByHost((await headers()).get('host') ?? '')
  if (!site) return new Response('not found', { status: 404 })
  const [hits, aliases] = await Promise.all([searchPages(site.rootPageId, q), listAliases(site.id)])
  return Response.json(hits.map((h) => ({ href: pageHref(h.pageId, site.rootPageId, aliases), title: h.title, text: h.text })))
}
