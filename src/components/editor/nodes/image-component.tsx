import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import type { NodeKey } from 'lexical';
import {
  $getNodeByKey,
  $getSelection,
  CLICK_COMMAND,
  mergeRegister,
  $isNodeSelection,
  DRAGSTART_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import * as React from 'react';

import { $isImageNode } from '@/components/editor/nodes/image-node';
import ImageResizer from '@/components/editor/nodes/image-resizer';
import cn from '@/lib/utils/cn';

type ImageComponentProps = {
  altText: string;
  height: 'inherit' | number;
  maxWidth: number;
  nodeKey: NodeKey;
  resizable: boolean;
  src: string;
  width: 'inherit' | number;
};

function BrokenImage() {
  return (
    <div className="flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-800">
      <div className="text-center">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600"
        >
          <path
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Image failed to load</p>
      </div>
    </div>
  );
}

type LazyImageProps = Omit<ImageComponentProps, 'nodeKey' | 'resizable'> & {
  imageRef: { current: HTMLImageElement | null };
  isFocused: boolean;
};

function LazyImage({ altText, height, imageRef, isFocused, maxWidth, src, width }: LazyImageProps) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return <BrokenImage />;
  }

  return (
    <img
      src={src}
      alt={altText}
      ref={imageRef}
      loading="lazy"
      draggable={false}
      onError={() => {
        return setHasError(true);
      }}
      className={cn('h-auto max-w-full rounded-lg', isFocused && 'ring-primary ring-2')}
      style={{
        height: height === 'inherit' ? 'auto' : `${height}px`,
        maxWidth: width === 'inherit' ? `${maxWidth}px` : undefined,
        width: width === 'inherit' ? '100%' : `${width}px`,
      }}
    />
  );
}

export default function ImageComponent({
  altText,
  height,
  maxWidth,
  nodeKey,
  resizable,
  src,
  width,
}: ImageComponentProps) {
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = React.useState(false);
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  const isInNodeSelection = React.useMemo(() => {
    return (
      isSelected &&
      editor.read(() => {
        const selection = $getSelection();

        return $isNodeSelection(selection) && selection.has(nodeKey);
      })
    );
  }, [editor, isSelected, nodeKey]);

  const onClick = React.useCallback(
    (event: MouseEvent) => {
      if (isResizing) {
        return true;
      }

      if (event.target === imageRef.current) {
        if (event.shiftKey) {
          setSelected(!isSelected);
        } else {
          clearSelection();
          setSelected(true);
        }

        return true;
      }

      return false;
    },
    [isResizing, isSelected, setSelected, clearSelection]
  );

  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand(CLICK_COMMAND, onClick, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => {
          if (event.target === imageRef.current) {
            event.preventDefault();

            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, onClick]);

  function onResizeStart() {
    setIsResizing(true);
  }

  function onResizeEnd(nextWidth: 'inherit' | number, nextHeight: 'inherit' | number) {
    setTimeout(() => {
      setIsResizing(false);
    }, 200);

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);

      if ($isImageNode(node)) {
        node.setWidthAndHeight(nextWidth, nextHeight);
      }
    });
  }

  const isFocused = (isSelected || isResizing) && isEditable;

  return (
    <>
      <LazyImage
        src={src}
        width={width}
        height={height}
        altText={altText}
        imageRef={imageRef}
        maxWidth={maxWidth}
        isFocused={isFocused}
      />
      {resizable && isInNodeSelection && isFocused && (
        <ImageResizer editor={editor} imageRef={imageRef} onResizeEnd={onResizeEnd} onResizeStart={onResizeStart} />
      )}
    </>
  );
}
