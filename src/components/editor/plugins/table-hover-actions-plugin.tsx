'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $isTableNode,
  $isTableRowNode,
  $isTableCellNode,
  $insertTableRowAtSelection,
  $insertTableColumnAtSelection,
} from '@lexical/table';
import { $getNodeByKey, $getNearestNodeFromDOMNode } from 'lexical';
import debounce from 'lodash.debounce';
import { PlusIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

const BUTTON_THICKNESS = 16;
const BUTTON_GAP = 4;
const HOVER_MARGIN = 4;

type HoveredTable = {
  isRightEdgeClipped: boolean;
  tableNodeKey: string;
  tableRect: DOMRect;
};

function isPointerNearTable(tableElement: HTMLTableElement, clientX: number, clientY: number) {
  const rect = tableElement.getBoundingClientRect();
  const outerMargin = BUTTON_THICKNESS + BUTTON_GAP + HOVER_MARGIN;

  return (
    clientX >= rect.left - HOVER_MARGIN &&
    clientX <= rect.right + outerMargin &&
    clientY >= rect.top - HOVER_MARGIN &&
    clientY <= rect.bottom + outerMargin
  );
}

export default function TableHoverActionsPlugin({ anchor }: { anchor: HTMLElement }) {
  const [editor] = useLexicalComposerContext();
  const lastPointerPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const [hoveredTable, setHoveredTable] = React.useState<HoveredTable | null>(null);

  React.useEffect(() => {
    let updateTimeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

    function updateFromPoint(clientX: number, clientY: number) {
      const rootElement = editor.getRootElement();

      if (!rootElement) {
        return;
      }

      const tableElement = [...rootElement.querySelectorAll<HTMLTableElement>('table.editor-table')].find((el) => {
        return isPointerNearTable(el, clientX, clientY);
      });

      if (!tableElement) {
        setHoveredTable(null);

        return;
      }

      editor.read('latest', () => {
        const tableNode = $getNearestNodeFromDOMNode(tableElement);

        if (!$isTableNode(tableNode)) {
          setHoveredTable(null);

          return;
        }

        const tableRect = tableElement.getBoundingClientRect();
        const scrollableWrapper = tableElement.closest('.editor-table-scrollable-wrapper');
        const isRightEdgeClipped = scrollableWrapper
          ? tableRect.right > scrollableWrapper.getBoundingClientRect().right
          : false;

        setHoveredTable({ isRightEdgeClipped, tableNodeKey: tableNode.getKey(), tableRect });
      });
    }

    const debouncedUpdateFromPoint = debounce((clientX: number, clientY: number) => {
      if (document.body.hasAttribute('data-table-resizing')) {
        setHoveredTable(null);

        return;
      }

      updateFromPoint(clientX, clientY);
    }, 50);

    function onPointerMove(event: PointerEvent) {
      lastPointerPosRef.current = { x: event.clientX, y: event.clientY };
      debouncedUpdateFromPoint(event.clientX, event.clientY);
    }

    function hide() {
      debouncedUpdateFromPoint.cancel();
      clearTimeout(updateTimeoutId);
      updateTimeoutId = undefined;
      lastPointerPosRef.current = null;
      setHoveredTable(null);
    }

    const unregisterUpdateListener = editor.registerUpdateListener(() => {
      const lastPointerPos = lastPointerPosRef.current;

      if (!lastPointerPos || updateTimeoutId !== undefined) {
        return;
      }

      updateTimeoutId = setTimeout(() => {
        updateTimeoutId = undefined;

        if (document.body.hasAttribute('data-table-resizing')) {
          setHoveredTable(null);

          return;
        }

        updateFromPoint(lastPointerPos.x, lastPointerPos.y);
      }, 0);
    });

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerleave', hide);
    anchor.addEventListener('scroll', hide);
    window.addEventListener('resize', hide);

    return () => {
      unregisterUpdateListener();
      clearTimeout(updateTimeoutId);
      debouncedUpdateFromPoint.cancel();
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', hide);
      anchor.removeEventListener('scroll', hide);
      window.removeEventListener('resize', hide);
    };
  }, [editor, anchor]);

  function appendRow() {
    if (!hoveredTable) {
      return;
    }

    editor.update(() => {
      const tableNode = $getNodeByKey(hoveredTable.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        return;
      }

      const lastRow = tableNode.getChildren().findLast($isTableRowNode);
      const lastCell = lastRow?.getChildren().findLast($isTableCellNode);

      if (!lastCell) {
        return;
      }

      lastCell.selectEnd();
      $insertTableRowAtSelection(true);
    });
    setHoveredTable(null);
  }

  function appendColumn() {
    if (!hoveredTable) {
      return;
    }

    editor.update(() => {
      const tableNode = $getNodeByKey(hoveredTable.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        return;
      }

      const firstRow = tableNode.getChildren().find($isTableRowNode);
      const lastCell = firstRow?.getChildren().findLast($isTableCellNode);

      if (!lastCell) {
        return;
      }

      lastCell.selectEnd();
      $insertTableColumnAtSelection(true);
    });
    setHoveredTable(null);
  }

  if (!hoveredTable) {
    return null;
  }

  const anchorRect = anchor.getBoundingClientRect();
  const { isRightEdgeClipped, tableRect } = hoveredTable;
  const left = tableRect.left - anchorRect.left + anchor.scrollLeft;
  const top = tableRect.top - anchorRect.top + anchor.scrollTop;
  const buttonClassName =
    'bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground flex cursor-pointer items-center justify-center rounded-sm transition-colors';

  return createPortal(
    <div className="absolute top-0 left-0 z-10">
      <button
        type="button"
        onClick={appendRow}
        aria-label="Add row below"
        className={buttonClassName}
        style={{
          height: BUTTON_THICKNESS,
          left,
          position: 'absolute',
          top: top + tableRect.height + BUTTON_GAP,
          width: tableRect.width,
        }}
      >
        <PlusIcon className="size-3.5" />
      </button>
      {!isRightEdgeClipped && (
        <button
          type="button"
          onClick={appendColumn}
          className={buttonClassName}
          aria-label="Add column right"
          style={{
            height: tableRect.height,
            left: left + tableRect.width + BUTTON_GAP,
            position: 'absolute',
            top,
            width: BUTTON_THICKNESS,
          }}
        >
          <PlusIcon className="size-3.5" />
        </button>
      )}
    </div>,
    anchor
  );
}
