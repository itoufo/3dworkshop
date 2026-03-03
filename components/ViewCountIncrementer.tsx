'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ViewCountIncrementer({ postId }: { postId: string }) {
  useEffect(() => {
    // Fire-and-forget: does not block page render
    supabase.rpc('increment_blog_view_count', { post_id: postId }).then(({ error }) => {
      if (error) {
        // RPC doesn't exist yet - fallback to SELECT + UPDATE
        supabase
          .from('blog_posts')
          .select('view_count')
          .eq('id', postId)
          .single()
          .then(({ data }) => {
            if (data) {
              supabase
                .from('blog_posts')
                .update({ view_count: (data.view_count || 0) + 1 })
                .eq('id', postId)
            }
          })
      }
    })
  }, [postId])

  return null
}
