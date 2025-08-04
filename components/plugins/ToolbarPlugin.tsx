'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import { $isHeadingNode } from '@lexical/rich-text'
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $createHeadingNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'

const INSERT_IMAGE_COMMAND = 'INSERT_IMAGE_COMMAND'

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Undo,
  Redo,
  Link2,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  ImageIcon,
} from 'lucide-react'

const LowPriority = 1

interface ToolbarPluginProps {
  uploadImage?: (file: File) => Promise<string>
}

export default function ToolbarPlugin({ uploadImage }: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [blockType, setBlockType] = useState('paragraph')
  const [elementFormat] = useState<'left' | 'center' | 'right' | 'justify'>('left')

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      // Update text format
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
      setIsCode(selection.hasFormat('code'))

      // Update links
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const node = getSelectedNode(selection) as any
      const parent = node.getParent()
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true)
      } else {
        setIsLink(false)
      }

      // Update block type
      const anchorNode = selection.anchor.getNode()
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow()
      const elementKey = element.getKey()
      const elementDOM = editor.getElementByKey(elementKey)
      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode)
          const type = parentList ? parentList.getTag() : element.getTag()
          setBlockType(type)
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType()
          setBlockType(type)
        }
      }
    }
  }, [editor])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        LowPriority
      )
    )
  }, [editor, updateToolbar])

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize))
        }
      })
    }
  }

  const formatList = (listType: 'ul' | 'ol') => {
    if (blockType !== listType) {
      editor.dispatchCommand(
        listType === 'ul' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined
      )
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    }
  }

  const insertLink = () => {
    if (!isLink) {
      const url = prompt('URLを入力してください:')
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    }
  }

  const insertImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && uploadImage) {
        try {
          const imageUrl = await uploadImage(file)
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              editor.dispatchCommand(
                INSERT_IMAGE_COMMAND as never,
                { src: imageUrl, altText: file.name } as never
              )
            }
          })
        } catch (error) {
          console.error('Error uploading image:', error)
          alert('画像のアップロードに失敗しました')
        }
      }
    }
    input.click()
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-gray-200 text-blue-600' : 'text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )

  const Separator = () => <div className="w-px h-6 bg-gray-300 mx-1" />

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-2">
      <div className="flex flex-wrap items-center gap-1">
        {/* 履歴 */}
        <ToolbarButton
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          disabled={!canUndo}
          title="元に戻す"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          disabled={!canRedo}
          title="やり直し"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* テキストフォーマット */}
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          isActive={isBold}
          title="太字"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
          isActive={isItalic}
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
          isActive={isUnderline}
          title="下線"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
          isActive={isStrikethrough}
          title="取り消し線"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
          isActive={isCode}
          title="コード"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* 見出し */}
        <ToolbarButton
          onClick={() => formatHeading('h1')}
          isActive={blockType === 'h1'}
          title="見出し1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => formatHeading('h2')}
          isActive={blockType === 'h2'}
          title="見出し2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => formatHeading('h3')}
          isActive={blockType === 'h3'}
          title="見出し3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* リスト */}
        <ToolbarButton
          onClick={() => formatList('ul')}
          isActive={blockType === 'ul'}
          title="箇条書きリスト"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => formatList('ol')}
          isActive={blockType === 'ol'}
          title="番号付きリスト"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* 配置 */}
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
          isActive={elementFormat === 'left'}
          title="左揃え"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
          isActive={elementFormat === 'center'}
          title="中央揃え"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
          isActive={elementFormat === 'right'}
          title="右揃え"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}
          isActive={elementFormat === 'justify'}
          title="両端揃え"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* リンクと画像 */}
        <ToolbarButton onClick={insertLink} isActive={isLink} title="リンク">
          {isLink ? <Unlink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title="画像を追加">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* その他 */}
        <ToolbarButton
          onClick={() => {
            editor.update(() => {
              const selection = $getSelection()
              if ($isRangeSelection(selection)) {
                selection.insertRawText('---')
              }
            })
          }}
          title="水平線"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>
      </div>
    </div>
  )
}

function getSelectedNode(selection: { anchor: { getNode: () => unknown }, focus: { getNode: () => unknown }, isBackward: () => boolean }) {
  const anchorNode = selection.anchor.getNode()
  const focusNode = selection.focus.getNode()
  if (anchorNode === focusNode) {
    return anchorNode
  }
  const isBackward = selection.isBackward()
  if (isBackward) {
    return focusNode
  } else {
    return anchorNode
  }
}