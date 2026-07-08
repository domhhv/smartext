'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $isTableNode,
  $isTableRowNode,
  $isTableCellNode,
  $insertTableRowAtSelection,
  $insertTableColumnAtSelection,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import { $getNodeByKey, isHTMLElement, $getNearestNodeFromDOMNode } from 'lexical';
import debounce from 'lodash.debounce';
import { PlusIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

const BUTTON_THICKNESS = 16;
const BUTTON_GAP = 4;

type HoveredTable = {
  isRightEdgeClipped: boolean;
  tableNodeKey: string;
  tableRect: DOMRect;
};

export default function TableHoverActionsPlugin({ anchor }: { anchor: HTMLElement }) {
  const [editor] = useLexicalComposerContext();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hoveredTable, setHoveredTable] = React.useState<HoveredTable | null>(null);

  React.useEffect(() => {
    const onPointerMove = debounce((event: PointerEvent) => {
      if (document.body.hasAttribute('data-table-resizing')) {
        setHoveredTable(null);

        return;
      }

      const target = event.target;

      if (!isHTMLElement(target) || target.closest('[data-table-resizer]')) {
        return;
      }

      const tableElement = target.closest<HTMLTableElement>('table.editor-table');
      const rootElement = editor.getRootElement();

      if (!tableElement || !rootElement?.contains(tableElement)) {
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
    }, 50);

    function onPointerLeave(event: PointerEvent) {
      const relatedTarget = event.relatedTarget;

      if (relatedTarget instanceof Node && containerRef.current?.contains(relatedTarget)) {
        return;
      }

      onPointerMove.cancel();
      setHoveredTable(null);
    }

    function hide() {
      onPointerMove.cancel();
      setHoveredTable(null);
    }

    anchor.addEventListener('scroll', hide);
    window.addEventListener('resize', hide);

    return mergeRegister(
      editor.registerRootListener((rootElement, prevRootElement) => {
        prevRootElement?.removeEventListener('pointermove', onPointerMove);
        prevRootElement?.removeEventListener('pointerleave', onPointerLeave);
        rootElement?.addEventListener('pointermove', onPointerMove);
        rootElement?.addEventListener('pointerleave', onPointerLeave);
      }),
      () => {
        onPointerMove.cancel();
        anchor.removeEventListener('scroll', hide);
        window.removeEventListener('resize', hide);
      }
    );
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
    <div ref={containerRef} className="absolute top-0 left-0 z-10">
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
