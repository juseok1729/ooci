import { purgePages } from '@/lib/notion'

export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return new Response('unauthorized', { status: 401 })
  }
  purgePages()
  return Response.json({ ok: true })
}
