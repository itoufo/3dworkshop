'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ViewCountIncrementer({ postId }: { postId: string }) {
  useEffect(() => {
    // Fire-and-forget: does not block page render
    // 閲覧数の加算は DB 側の関数（increment_blog_view_count）が行う。
    // ⚠ ここから blog_posts を直接 UPDATE しない。anon は記事を書き換えられない
    supabase.rpc('increment_blog_view_count', { post_id: postId }).then(({ error }) => {
      if (error) console.error('view count failed:', error.message)
    })
  }, [postId])

  return null
}
