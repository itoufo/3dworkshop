'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, $insertNodes } from 'lexical'
import { 
  InitialConfigType, 
  LexicalComposer 
} from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import ToolbarPlugin from './plugins/ToolbarPlugin'
import ImagePlugin, { INSERT_IMAGE_COMMAND } from './plugins/ImagePlugin'
import { ImageNode } from './nodes/ImageNode'
import EditorRefPlugin from './plugins/EditorRefPlugin'
import { 
  Eye, 
  EyeOff, 
  Upload,
  Code
} from 'lucide-react'
import styles from '@/app/workshops/[id]/workshop.module.css'

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5'
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem'
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem'
  },
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code'
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable'
  }
}

function onError(error: Error) {
  console.error(error)
}

interface LexicalRichTextEditorProps {
  initialContent?: string
  onChange: (content: string) => void
  placeholder?: string
}

// HTMLコンテンツを設定するプラグイン
const HtmlPlugin = React.memo(({ html }: { html: string }) => {
  const [editor] = useLexicalComposerContext()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // 初回のみHTMLを設定
    if (html && !isInitialized) {
      editor.update(() => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(html, 'text/html')
        const nodes = $generateNodesFromDOM(editor, dom)
        $getRoot().clear()
        $insertNodes(nodes)
      })
      setIsInitialized(true)
    }
  }, [editor, html, isInitialized])

  return null
})
HtmlPlugin.displayName = 'HtmlPlugin'

// 画像アップロードハンドラー
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('画像のアップロードに失敗しました')
  }

  const data = await response.json()
  return data.imageUrl
}

export default function LexicalRichTextEditor({
  initialContent = '',
  onChange,
  placeholder = 'ここに内容を入力...'
}: LexicalRichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [htmlContent, setHtmlContent] = useState(initialContent || '')
  const [showHtmlSource, setShowHtmlSource] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const initialConfig: InitialConfigType = useMemo(
    () => ({
      namespace: 'Workshop Editor',
      theme,
      onError,
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        CodeHighlightNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        AutoLinkNode,
        LinkNode,
        ImageNode
      ],
      editorState: null
    }),
    []
  )

  const handleEditorChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_editorState: unknown, editor: any) => {
      editor.read(() => {
        const html = $generateHtmlFromNodes(editor)
        setHtmlContent(html)
        
        // デバウンス処理でonChangeを呼び出す
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
        debounceTimerRef.current = setTimeout(() => {
          onChange(html)
        }, 300)
      })
    },
    [onChange]
  )

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageUrl = await uploadImage(file)
      // エディタがマウントされている場合のみ画像を挿入
      if (window.lexicalEditor) {
        window.lexicalEditor.dispatchCommand(
          INSERT_IMAGE_COMMAND,
          { src: imageUrl, altText: file.name }
        )
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('ファイルのアップロードに失敗しました')
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* エディタヘッダー */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm">ファイルアップロード</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHtmlSource(!showHtmlSource)}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
              showHtmlSource ? 'bg-gray-700 text-white' : 'bg-white hover:bg-gray-100'
            }`}
            title="HTMLソースを表示"
          >
            <Code className="w-4 h-4" />
            <span>HTML</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
              showPreview ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'
            }`}
            title={showPreview ? 'エディタに戻る' : 'プレビューを表示'}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showPreview ? 'エディタ' : 'プレビュー'}</span>
          </button>
        </div>
      </div>

      {/* HTMLソース表示 */}
      {showHtmlSource && (
        <div className="border-b border-gray-200 bg-gray-900 p-4">
          <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-all">
            <code>{htmlContent || ''}</code>
          </pre>
        </div>
      )}

      {/* エディタ/プレビュー本体 */}
      {showPreview ? (
        <div className="p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          <div
            className={styles.workshopContent}
            dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
          />
        </div>
      ) : (
        <LexicalComposer initialConfig={initialConfig}>
          <div className="relative">
            <ToolbarPlugin uploadImage={uploadImage} />
            <div className="relative">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable 
                    className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 focus:outline-none editor-input"
                    aria-placeholder={placeholder}
                    placeholder={
                      <div className="absolute top-4 left-4 text-gray-500 pointer-events-none">
                        {placeholder}
                      </div>
                    }
                    spellCheck={false}
                  />
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <OnChangePlugin onChange={handleEditorChange} />
              <HistoryPlugin />
              <LinkPlugin />
              <ListPlugin />
              <ImagePlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <TabIndentationPlugin />
              <HtmlPlugin html={initialContent || ''} />
              <EditorRefPlugin />
            </div>
          </div>
        </LexicalComposer>
      )}

      {/* ステータスバー */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 flex justify-between">
        <span>{(htmlContent || '').length} 文字 (HTML)</span>
        <span>{showPreview ? 'プレビューモード' : 'エディタモード'}</span>
      </div>

      {/* スタイル定義 */}
      <style jsx global>{`
        .editor-input {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .editor-paragraph {
          margin: 0 0 15px 0;
          position: relative;
        }
        .editor-heading-h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0 0 15px 0;
        }
        .editor-heading-h2 {
          font-size: 1.2rem;
          font-weight: bold;
          margin: 0 0 15px 0;
        }
        .editor-heading-h3 {
          font-size: 1.1rem;
          font-weight: bold;
          margin: 0 0 15px 0;
        }
        .editor-list-ol {
          padding: 0;
          margin: 0 0 15px 20px;
          list-style-type: decimal;
        }
        .editor-list-ul {
          padding: 0;
          margin: 0 0 15px 20px;
          list-style-type: disc;
        }
        .editor-listitem {
          margin: 8px 0;
        }
        .editor-nested-listitem {
          list-style-type: none;
        }
        .editor-link {
          color: rgb(37, 99, 235);
          text-decoration: underline;
        }
        .editor-text-bold {
          font-weight: bold;
        }
        .editor-text-italic {
          font-style: italic;
        }
        .editor-text-underline {
          text-decoration: underline;
        }
        .editor-text-strikethrough {
          text-decoration: line-through;
        }
        .editor-text-code {
          background-color: rgb(243, 244, 246);
          padding: 2px 4px;
          font-family: monospace;
          font-size: 0.875em;
        }
        .editor-code {
          background-color: rgb(243, 244, 246);
          font-family: monospace;
          display: block;
          padding: 12px;
          margin: 15px 0;
          border-radius: 4px;
          overflow-x: auto;
        }
        .editor-quote {
          margin: 15px 0;
          padding-left: 20px;
          border-left: 4px solid rgb(229, 231, 235);
          color: rgb(107, 114, 128);
        }
        .editor-image-container {
          display: inline-block;
          position: relative;
          vertical-align: bottom;
          user-select: none;
          margin: 15px 0;
        }
        .editor-image {
          max-width: 100%;
          height: auto;
          display: block;
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}