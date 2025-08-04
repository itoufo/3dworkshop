import React from 'react'
import { 
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  NodeKey,
  SerializedLexicalNode,
  Spread
} from 'lexical'

export interface ImagePayload {
  altText: string
  caption?: string
  height?: number
  key?: NodeKey
  maxWidth?: number
  showCaption?: boolean
  src: string
  width?: number
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  return new ImageNode(
    payload.src,
    payload.altText,
    payload.maxWidth,
    payload.width,
    payload.height,
    payload.showCaption,
    payload.caption,
    payload.key
  )
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src } = domNode
    const node = $createImageNode({ altText, src })
    return { node }
  }
  return null
}

export type SerializedImageNode = Spread<
  {
    altText: string
    caption?: string
    height?: number
    maxWidth?: number
    showCaption?: boolean
    src: string
    width?: number
    type: 'image'
    version: 1
  },
  SerializedLexicalNode
>

export class ImageNode extends DecoratorNode<React.ReactElement> {
  __src: string
  __altText: string
  __width: 'inherit' | number
  __height: 'inherit' | number
  __maxWidth: number
  __showCaption: boolean
  __caption?: string

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, caption, src, showCaption } = serializedNode
    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      showCaption,
      src,
      width,
      caption
    })
    return node
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__altText)
    element.className = 'editor-image'
    if (this.__width !== 'inherit') {
      element.style.width = `${this.__width}px`
    }
    if (this.__height !== 'inherit') {
      element.style.height = `${this.__height}px`
    }
    if (this.__maxWidth) {
      element.style.maxWidth = `${this.__maxWidth}px`
    }
    return { element }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0
      })
    }
  }

  constructor(
    src: string,
    altText: string,
    maxWidth?: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    showCaption?: boolean,
    caption?: string,
    key?: NodeKey
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__maxWidth = maxWidth || 500
    this.__width = width || 'inherit'
    this.__height = height || 'inherit'
    this.__showCaption = showCaption || false
    this.__caption = caption
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      caption: this.__caption,
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width
    }
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number
  ): void {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable()
    writable.__showCaption = showCaption
  }

  setCaption(caption: string): void {
    const writable = this.getWritable()
    writable.__caption = caption
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  decorate(): React.ReactElement {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        className="editor-image"
        style={{
          maxWidth: this.__maxWidth ? `${this.__maxWidth}px` : '100%',
          width: this.__width !== 'inherit' ? `${this.__width}px` : 'auto',
          height: this.__height !== 'inherit' ? `${this.__height}px` : 'auto'
        }}
      />
    )
  }
}