import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { defaultMapImageUrl, getBlockIcon, getBlockTitle, getBlockValue, getPageBreadcrumbs, getPageTitle, getTextContent } from 'notion-utils'
import type { Block, ExtendedRecordMap } from 'notion-types'
import { findSiteByHost, listAliases } from '@/lib/sites'
import { getPage } from '@/lib/notion'
import { defaultMenu, resolvePageId } from '@/lib/resolve'
import OopyShell, { type Crumb } from '@/components/OopyShell'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug?: string[] }> }

function rootIcon(block: Block | undefined, map: ExtendedRecordMap) {
  const icon = block && getBlockIcon(block, map)
  return (block && icon?.startsWith('http') ? defaultMapImageUrl(icon, block) : icon) || undefined
}

const load = cache(async (slug: string[]) => {
  const host = (await headers()).get('host') ?? ''
  const site = await findSiteByHost(host)
  if (!site) notFound()
  const aliases = await listAliases(site.id)
  const pageId = resolvePageId(slug, site.rootPageId, aliases)
  if (!pageId) notFound()

  const [recordMap, root] = await Promise.all([
    getPage(pageId).catch((e) => (console.error('notion getPage failed', pageId, e), null)),
    pageId === site.rootPageId ? null : getPage(site.rootPageId).catch((e) => (console.error('notion getPage failed', site.rootPageId, e), null)),
  ])
  if (!recordMap?.block[pageId]) notFound()
  const rootMap = root ?? recordMap

  // Only pages under the site's root are served (oopy behaviour). Ancestors come back with loadPageChunk.
  const crumbs: Crumb[] = (getPageBreadcrumbs(recordMap, pageId) ?? []).map((c) => ({
    pageId: c.pageId, title: c.title, active: c.active,
    icon: c.icon?.startsWith('http') ? defaultMapImageUrl(c.icon, c.block) : c.icon,
  }))
  if (pageId !== site.rootPageId && !crumbs.some((c) => c.pageId === site.rootPageId)) notFound()

  const rootBlock = getBlockValue(rootMap.block[site.rootPageId])
  return {
    site, aliases, pageId, recordMap, crumbs,
    menu: site.settings.menu ?? defaultMenu(rootMap, site.rootPageId, aliases),
    siteTitle: site.title || (rootBlock && getBlockTitle(rootBlock, rootMap)) || site.slug,
    siteIcon: site.settings.favicon || rootIcon(rootBlock, rootMap),
  }
})

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug = [] } = await params
  const { site, pageId, recordMap, siteTitle, siteIcon } = await load(slug)
  const block = getBlockValue(recordMap.block[pageId])!
  const title = getPageTitle(recordMap) || siteTitle
  const cover = defaultMapImageUrl(block.format?.page_cover, block)
  const firstText = (block.content ?? [])
    .map((id) => getBlockValue(recordMap.block[id]))
    .find((b) => b?.type === 'text' && b.properties?.title)
  const description = firstText ? getTextContent(firstText.properties?.title).slice(0, 160) : undefined
  return {
    title: pageId === site.rootPageId ? title : `${title} | ${siteTitle}`,
    description,
    openGraph: { title, description, siteName: siteTitle, images: cover ? [cover] : undefined, type: 'website' },
    icons: siteIcon?.startsWith('http') ? [siteIcon] : undefined,
  }
}

export default async function Page({ params }: Params) {
  const { slug = [] } = await params
  const d = await load(slug)
  return (
    <>
      {d.site.settings.customCss && <style dangerouslySetInnerHTML={{ __html: d.site.settings.customCss }} />}
      <div style={{ fontFamily: d.site.settings.font ? `'${d.site.settings.font}', var(--notion-font)` : undefined, ['--oopy-color' as string]: d.site.settings.brandColor }}>
        <OopyShell
          recordMap={d.recordMap}
          pageId={d.pageId}
          rootPageId={d.site.rootPageId}
          aliases={d.aliases}
          menu={d.menu}
          crumbs={d.crumbs}
          siteTitle={d.siteTitle}
          siteIcon={d.siteIcon}
          settings={d.site.settings}
          currentPath={'/' + slug.join('/')}
        />
      </div>
    </>
  )
}
