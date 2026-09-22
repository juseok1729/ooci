'use client'

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { NotionRenderer } from 'react-notion-x'
import type { Block, ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'
import type { Alias, MenuItem, SiteSettings } from '@/lib/sites'
import { SEARCH_MARK, formatNotionDate, formatNotionTime, pageHref } from '@/lib/resolve'

const Code = dynamic(() => import('react-notion-x/third-party/code').then((m) => m.Code))
const LibCollection = dynamic(() => import('react-notion-x/third-party/collection').then((m) => m.Collection))

// oopy shows the view tab (icon + view name) even for a single-view database; react-notion-x only renders tabs for 2+ views.
const VIEW_ICON: Record<string, string> = {
  table: 'M2 0h10a2 2 0 012 2v10a2 2 0 01-2 2H2a2 2 0 01-2-2V2a2 2 0 012-2zm3.75 5.67v2.66h6.75V5.67H5.75zm0 4.17v2.66h5.75a1 1 0 001-1V9.84H5.75zM1.5 5.67v2.66h2.75V5.67H1.5zm0 4.17v1.66a1 1 0 001 1h1.75V9.84H1.5zm1-8.34a1 1 0 00-1 1v1.66h2.75V1.5H2.5zm3.25 0v2.66h6.75V2.5a1 1 0 00-1-1H5.75z',
  gallery: 'M12 1.5H2a.5.5 0 00-.5.5v10a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V2a.5.5 0 00-.5-.5zM2 0h10a2 2 0 012 2v10a2 2 0 01-2 2H2a2 2 0 01-2-2V2a2 2 0 012-2zm1 3h3.5v3.5H3V3zm4.5 0H11v3.5H7.5V3zM3 7.5h3.5V11H3V7.5zm4.5 0H11V11H7.5V7.5z',
}
function Collection(props: ComponentProps<typeof LibCollection>) {
  const viewIds = (props.block as { view_ids?: string[] }).view_ids ?? []
  const view = viewIds.length === 1 ? getBlockValue(props.ctx.recordMap.collection_view[viewIds[0]]) : undefined
  return (
    <>
      {view && (
        <div className="notion-collection-view-tabs-row">
          <button className="notion-collection-view-tabs-content-item notion-collection-view-tabs-content-item-active">
            <div className="notion-collection-view-type">
              <svg className="notion-collection-view-type-icon" viewBox="0 0 14 14"><path d={VIEW_ICON[view.type] ?? VIEW_ICON.table} /></svg>
              <span className="notion-collection-view-type-title">{view.name || view.type}</span>
            </div>
          </button>
        </div>
      )}
      <LibCollection {...props} />
    </>
  )
}
const Equation = dynamic(() => import('react-notion-x/third-party/equation').then((m) => m.Equation))

// Collection date/time cells: oopy renders YYYY/MM/DD HH:mm instead of react-notion-x's "Sep 20, 2026 08:26 PM".
const propertyCreatedTimeValue = ({ block }: { block: Block }) => formatNotionTime(block.created_time)
const propertyLastEditedTimeValue = ({ block }: { block: Block }) => formatNotionTime(block.last_edited_time)
const propertyDateValue = ({ data }: { data?: unknown[][] }, fallback: () => ReactNode) => {
  const d = (data?.[0]?.[1] as [string, Parameters<typeof formatNotionDate>[0]][] | undefined)?.find((x) => x[0] === 'd')?.[1]
  return formatNotionDate(d) ?? fallback()
}

export type Crumb = { pageId: string; title: string; icon?: string; active: boolean }

type Props = {
  recordMap: ExtendedRecordMap
  pageId: string
  rootPageId: string
  aliases: Alias[]
  menu: MenuItem[]
  crumbs: Crumb[]
  siteTitle: string
  siteIcon?: string
  settings: SiteSettings
  currentPath: string
}

function Icon({ icon, className }: { icon?: string; className?: string }) {
  if (!icon) return null
  return icon.startsWith('http') || icon.startsWith('/')
    ? <img src={icon} alt="" className={className} />
    : <span className={className ?? 'oopy-icon'} role="img" style={{ fontFamily: 'var(--emoji-font-family)' }}>{icon}</span>
}

function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('oopy-theme', next ? 'dark' : 'light') } catch {}
  }
  return [dark, toggle] as const
}

type Hit = { href: string; title: string; text: string }

/** Notion highlight markers -> <mark>, without HTML injection. */
function Highlight({ text }: { text: string }) {
  return <>{text.split(SEARCH_MARK).map((seg, i) => (i % 2 ? <mark key={i}>{seg}</mark> : seg))}</>
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) { d.showModal(); d.querySelector('input')?.focus() }
    if (!open && d.open) d.close()
  }, [open])
  useEffect(() => {
    if (!q.trim()) { setHits(null); return }
    const ctl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal }).then((r) => r.json()).then(setHits).catch(() => {})
    }, 250)
    return () => { clearTimeout(t); ctl.abort() }
  }, [q])
  return (
    <dialog ref={ref} className="oopy-search" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="oopy-search-box">
        <input type="search" placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} />
        {hits && (
          <ul className="oopy-search-results">
            {hits.length === 0 && <li className="oopy-search-empty">결과 없음</li>}
            {hits.map((h) => (
              <li key={h.href}><a href={h.href}><strong>{h.title}</strong>{h.text && <span><Highlight text={h.text} /></span>}</a></li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  )
}

export default function OopyShell(p: Props) {
  const [dark, toggleDark] = useDarkMode()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(false)
  useEffect(() => setOpen(false), [p.currentPath])

  const brand = (
    <a className="oopy-brand" href="/">
      <Icon icon={p.siteIcon} className="oopy-icon" />
      <span>{p.siteTitle}</span>
    </a>
  )
  const menuLinks = p.menu.map((m) => (
    <a key={m.href} href={m.href} aria-current={m.href === p.currentPath ? 'page' : undefined}>{m.title}</a>
  ))
  const searchBtn = (
    <button className="oopy-iconbtn oopy-search-btn" aria-label="검색" onClick={() => setSearch(true)}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span>검색</span>
    </button>
  )
  const darkSwitch = (
    <button className="oopy-switch" role="switch" aria-checked={dark} aria-label="다크 모드" onClick={toggleDark} />
  )

  return (
    <div className="notion-app">
      <div className="notion-frame">
        <div className="oopy-top">
          <div className="oopy-topbar">
            <div>{brand}</div>
            <nav className="oopy-menu">{menuLinks}</nav>
            <div className="oopy-actions">{searchBtn}{darkSwitch}</div>
          </div>
          <div className="oopy-topbar-mobile">
            {brand}
            <div className="oopy-actions">{searchBtn}<button className="oopy-iconbtn" aria-label="메뉴 열기" onClick={() => setOpen(true)}>☰</button></div>
          </div>
          <div className="oopy-line" />
          <div className="oopy-progress" />
          {p.crumbs.length > 1 && (
            <nav className="oopy-crumbs" aria-label="breadcrumb">
              {p.crumbs.map((c, i) => (
                <span key={c.pageId} style={{ display: 'contents' }}>
                  {i > 0 && <span className="oopy-crumb-sep">/</span>}
                  <a className="oopy-crumb" href={pageHref(c.pageId, p.rootPageId, p.aliases)} aria-current={c.active ? 'page' : undefined}>
                    <Icon icon={c.icon} />
                    <span>{c.title}</span>
                  </a>
                </span>
              ))}
            </nav>
          )}
        </div>

        {open && <div className="oopy-overlay" onClick={() => setOpen(false)} />}
        <aside className="oopy-drawer" data-open={open} aria-hidden={!open}>
          <div className="oopy-drawer-head">
            {darkSwitch}
            <span style={{ flex: 1 }} />
            <button className="oopy-iconbtn" aria-label="메뉴 닫기" onClick={() => setOpen(false)}>✕</button>
          </div>
          {menuLinks}
        </aside>

        <NotionRenderer
          recordMap={p.recordMap}
          rootPageId={p.rootPageId}
          fullPage
          disableHeader
          darkMode={dark}
          previewImages={false}
          mapPageUrl={(id) => pageHref(id, p.rootPageId, p.aliases)}
          components={{ Code, Collection, Equation, propertyDateValue, propertyCreatedTimeValue, propertyLastEditedTimeValue }}
        />

        {p.settings.footer && <footer className="oopy-footer"><span>{p.settings.footer}</span></footer>}
        <SearchDialog open={search} onClose={() => setSearch(false)} />
        <button className="oopy-totop" aria-label="맨 위로" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑<span>TOP</span></button>
      </div>
    </div>
  )
}
