import { STORE_URL } from '@/lib/store/urls'

export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /sell',
    'Disallow: /login',
    'Disallow: /auth/',
    '',
    `Sitemap: ${STORE_URL}/sitemap.xml`,
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
