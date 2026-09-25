import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_URL } from '@/lib/store/urls'

/** stores.3dlab.jp の sitemap（3dlab.jp の public/sitemap.xml とは別） */
export const dynamic = 'force-dynamic'

export async function GET() {
  const urls: { loc: string; lastmod?: string }[] = [{ loc: `${STORE_URL}/` }]

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('store_products')
      .select('id, updated_at')
      .eq('status', 'published')
    for (const p of data ?? []) {
      urls.push({ loc: `${STORE_URL}/p/${p.id}`, lastmod: p.updated_at })
    }
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
      .join('\n') +
    '\n</urlset>\n'

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
