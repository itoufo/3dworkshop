import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url: string
  category: string
  tags: string[]
  author_name: string
  is_published: boolean
  published_at: string
  updated_at?: string
  view_count: number
  created_at: string
}

// React cache() deduplicates during a single server request.
// layout.tsx (generateMetadata + body) and page.tsx share the same result.
export const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  return data
})

export async function getRelatedPosts(postId: string, category: string): Promise<BlogPost[]> {
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image_url, category, tags, author_name, published_at, view_count')
    .eq('is_published', true)
    .eq('category', category)
    .neq('id', postId)
    .order('published_at', { ascending: false })
    .limit(3)
  return (data as BlogPost[]) || []
}

export async function getAllCategories(): Promise<string[]> {
  const { data } = await supabase
    .from('blog_posts')
    .select('category')
    .eq('is_published', true)
    .not('category', 'is', null)
  if (!data) return []
  return Array.from(new Set(data.map(p => p.category).filter(Boolean)))
}
