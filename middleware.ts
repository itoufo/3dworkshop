import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''

  // Netlifyサブドメインからのアクセスをリダイレクト
  if (host.includes('netlify.app')) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    url.host = '3dlab.jp'

    return NextResponse.redirect(url, 301)
  }

  // wwwからのアクセスをリダイレクト
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    url.host = host.replace('www.', '')

    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

// ミドルウェアを全てのパスに適用
export const config = {
  matcher: '/:path*',
}
