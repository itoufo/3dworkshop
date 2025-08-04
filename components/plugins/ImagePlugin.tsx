'use client'

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical'
import { ImageNode, $createImageNode } from '../nodes/ImageNode'

export const INSERT_IMAGE_COMMAND = createCommand<{src: string; altText?: string}>('INSERT_IMAGE_COMMAND')

interface ImagePluginProps {
  uploadImage?: (file: File) => Promise<string>
}

export default function ImagePlugin(_props: ImagePluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagePlugin: ImageNode not registered on editor')
    }

    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode({
          src: payload.src,
          altText: payload.altText || '',
        })
        $insertNodes([imageNode])
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}

