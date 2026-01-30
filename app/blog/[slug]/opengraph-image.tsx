import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = '3DLab ブログ記事'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data: blogPost } = await supabase
    .from('blog_posts')
    .select('title, category, author_name, published_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  const title = blogPost?.title || 'ブログ記事'
  const category = blogPost?.category || ''
  const author = blogPost?.author_name || '3DLab'
  const date = blogPost?.published_at
    ? new Date(blogPost.published_at).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f59e0b 100%)',
        }}
      >
        {/* Category badge */}
        {category && (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '8px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '24px',
              color: '#fff',
              fontSize: '20px',
            }}
          >
            {category}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: title.length > 40 ? '42px' : '52px',
              fontWeight: 'bold',
              color: '#fff',
              lineHeight: 1.3,
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              maxHeight: '320px',
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
              {author}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
              {date}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#fff',
              }}
            >
              3DLab
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '16px',
              }}
            >
              3Dプリンタ教室
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
