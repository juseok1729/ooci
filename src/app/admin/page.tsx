import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parsePageId } from 'notion-utils'
import { deleteSite, listSites, upsertSite, listAliases } from '@/lib/sites'
import { purgePages } from '@/lib/notion'

export const dynamic = 'force-dynamic'

async function authed() {
  const token = process.env.ADMIN_TOKEN
  return !!token && (await cookies()).get('admin')?.value === token
}

async function login(form: FormData) {
  'use server'
  if (form.get('token') === process.env.ADMIN_TOKEN) {
    ;(await cookies()).set('admin', String(form.get('token')), { httpOnly: true, sameSite: 'lax', path: '/admin' })
  }
  redirect('/admin')
}

async function save(form: FormData) {
  'use server'
  if (!(await authed())) redirect('/admin')
  const s = (k: string) => String(form.get(k) ?? '').trim()
  const rootPageId = parsePageId(s('rootPageId'), { uuid: true })
  if (!rootPageId || !/^[a-z0-9-]{1,63}$/.test(s('slug'))) redirect('/admin?err=invalid')
  const aliases = s('aliases').split('\n').map((l) => l.trim().split(/\s+/)).flatMap(([path, id]) => {
    const pageId = parsePageId(id, { uuid: true })
    return path && pageId ? [{ path: path.replace(/^\/+|\/+$/g, ''), pageId }] : []
  })
  await upsertSite({
    id: Number(s('id')) || undefined, slug: s('slug'), customDomain: s('customDomain').toLowerCase() || null,
    rootPageId, title: s('title') || null, ownerEmail: s('ownerEmail'),
    settings: JSON.parse(s('settings') || '{}'),
  }, aliases)
  purgePages()
  redirect('/admin')
}

async function remove(form: FormData) {
  'use server'
  if (!(await authed())) redirect('/admin')
  await deleteSite(Number(form.get('id')))
  redirect('/admin')
}

const input = { width: '100%', padding: 6, boxSizing: 'border-box' as const, fontFamily: 'inherit' }

export default async function Admin({ searchParams }: { searchParams: Promise<{ edit?: string; err?: string }> }) {
  if (!(await authed())) {
    return (
      <form action={login} style={{ maxWidth: 360, margin: '20vh auto', display: 'grid', gap: 8 }}>
        <input name="token" type="password" placeholder="ADMIN_TOKEN" style={input} autoFocus />
        <button>로그인</button>
      </form>
    )
  }
  const { edit, err } = await searchParams
  const sites = await listSites()
  const cur = sites.find((s) => String(s.id) === edit)
  const aliases = cur ? await listAliases(cur.id) : []

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px', fontSize: 14 }}>
      <h1>OOCI sites</h1>
      {err && <p style={{ color: 'crimson' }}>slug 또는 Notion 페이지 ID가 올바르지 않습니다.</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
        <thead><tr>{['slug', 'custom domain', 'root page', 'owner', ''].map((h) => <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 6 }}>{h}</th>)}</tr></thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: 6 }}><a href={`https://${s.slug}.${process.env.BASE_DOMAIN}`}>{s.slug}</a></td>
              <td style={{ padding: 6 }}>{s.customDomain}</td>
              <td style={{ padding: 6, fontFamily: 'monospace' }}>{s.rootPageId}</td>
              <td style={{ padding: 6 }}>{s.ownerEmail}</td>
              <td style={{ padding: 6, whiteSpace: 'nowrap' }}>
                <a href={`/admin?edit=${s.id}`}>수정</a>{' '}
                <form action={remove} style={{ display: 'inline' }}><input type="hidden" name="id" value={s.id} /><button>삭제</button></form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{cur ? `수정: ${cur.slug}` : '사이트 등록'}</h2>
      <form action={save} style={{ display: 'grid', gap: 10 }}>
        <input type="hidden" name="id" value={cur?.id ?? ''} />
        <label>slug (→ slug.{process.env.BASE_DOMAIN})<input name="slug" defaultValue={cur?.slug} required pattern="[a-z0-9-]{1,63}" style={input} /></label>
        <label>custom domain (선택, DNS CNAME → 로드밸런서)<input name="customDomain" defaultValue={cur?.customDomain ?? ''} style={input} /></label>
        <label>Notion root page (공개된 페이지 URL 또는 ID)<input name="rootPageId" defaultValue={cur?.rootPageId} required style={input} /></label>
        <label>site title (비우면 Notion 페이지 제목)<input name="title" defaultValue={cur?.title ?? ''} style={input} /></label>
        <label>owner email<input name="ownerEmail" type="email" defaultValue={cur?.ownerEmail} required style={input} /></label>
        <label>URL aliases (한 줄에 <code>path pageId</code>)<textarea name="aliases" rows={4} defaultValue={aliases.map((a) => `${a.path} ${a.pageId}`).join('\n')} style={{ ...input, fontFamily: 'monospace' }} /></label>
        <label>settings JSON (menu, font, brandColor, favicon, footer, customCss)<textarea name="settings" rows={6} defaultValue={JSON.stringify(cur?.settings ?? {}, null, 2)} style={{ ...input, fontFamily: 'monospace' }} /></label>
        <button style={{ padding: 8 }}>{cur ? '저장' : '등록'}</button>
        {cur && <a href="/admin">취소</a>}
      </form>
    </main>
  )
}
