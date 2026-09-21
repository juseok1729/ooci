'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { NotionRenderer } from 'react-notion-x'
import type { ExtendedRecordMap } from 'notion-types'
import type { Alias, MenuItem, SiteSettings } from '@/lib/sites'
import { pageHref } from '@/lib/resolve'

const Code = dynamic(() => import('react-notion-x/third-party/code').then((m) => m.Code))
const Collection = dynamic(() => import('react-notion-x/third-party/collection').then((m) => m.Collection))
const Equation = dynamic(() => import('react-notion-x/third-party/equation').then((m) => m.Equation))

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

export default function OopyShell(p: Props) {
  const [dark, toggleDark] = useDarkMode()
  const [open, setOpen] = useState(false)
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
            <div className="oopy-actions">{darkSwitch}</div>
          </div>
          <div className="oopy-topbar-mobile">
            {brand}
            <button className="oopy-iconbtn" aria-label="메뉴 열기" onClick={() => setOpen(true)}>☰</button>
          </div>
          <div className="oopy-line" />
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
          components={{ Code, Collection, Equation }}
        />

        {p.settings.footer && <footer className="oopy-footer"><span>{p.settings.footer}</span></footer>}
      </div>
    </div>
  )
}
