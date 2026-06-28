import type {
  Spread,
  NodeKey,
  LexicalNode,
  EditorConfig,
  DOMExportOutput,
  DOMConversionMap,
  DOMConversionOutput,
  SerializedLexicalNode,
} from 'lexical';
import { DecoratorNode } from 'lexical';
import type { JSX } from 'react';

import ImageComponent from './image-component';

type ImagePayload = {
  altText: string;
  height?: 'inherit' | number;
  key?: NodeKey;
  maxWidth?: number;
  src: string;
  width?: 'inherit' | number;
};

type SerializedImageNode = Spread<
  {
    altText: string;
    height?: 'inherit' | number;
    maxWidth: number;
    src: string;
    width?: 'inherit' | number;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __maxWidth: number;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__maxWidth, node.__width, node.__height, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, maxWidth, src, width } = serializedNode;

    return $createImageNode({
      altText,
      height,
      maxWidth,
      src,
      width,
    });
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);

    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => {
        return {
          conversion: $convertImageElement,
          priority: 0,
        };
      },
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height,
      maxWidth: this.__maxWidth,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width,
    };
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;

    if (className !== undefined) {
      span.className = className;
    }

    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        width={this.__width}
        height={this.__height}
        altText={this.__altText}
        maxWidth={this.__maxWidth}
      />
    );
  }
}

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement;

  if (img.src.startsWith('file:///')) {
    return null;
  }

  const { alt: altText, height, src, width } = img;
  const node = $createImageNode({ altText, height, src, width });

  return { node };
}

export function $createImageNode({ altText, height, key, maxWidth = 500, src, width }: ImagePayload): ImageNode {
  return new ImageNode(src, altText, maxWidth, width, height, key);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
