'use client'

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import { LexicalEditor } from 'lexical'

declare global {
  interface Window {
    lexicalEditor?: LexicalEditor
  }
}

export default function EditorRefPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // グローバルにエディタの参照を保存
    window.lexicalEditor = editor

    return () => {
      // クリーンアップ
      if (window.lexicalEditor === editor) {
        delete window.lexicalEditor
      }
    }
  }, [editor])

  return null
}