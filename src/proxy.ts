import { NextResponse, type NextRequest } from 'next/server'

// OCI Load Balancer forwards X-Forwarded-Host as "host:80" / "host:443". Next.js compares that host against the
// browser's Origin (no default port) for Server Actions CSRF checks and rejects the mismatch. Drop the default port.
export function proxy(req: NextRequest) {
  const xfh = req.headers.get('x-forwarded-host')
  const fixed = xfh?.replace(/:(80|443)$/, '')
  if (!xfh || fixed === xfh) return NextResponse.next()
  const headers = new Headers(req.headers)
  headers.set('x-forwarded-host', fixed!)
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ['/((?!_next/).*)'] }
