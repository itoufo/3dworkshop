'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// 記事表示時に view_count を +1 する。描画をブロックしない fire-and-forget。
// RPC は supabase/migrations/20260917_increment_blog_view_count.sql で定義。
export default function ViewCountIncrementer({ postId }: { postId: string }) {
  useEffect(() => {
    supabase.rpc('increment_blog_view_count', { post_id: postId }).then(({ error }) => {
      if (error) console.error('increment_blog_view_count failed:', error.message)
    })
  }, [postId])

  return null
}
