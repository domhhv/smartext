'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { TableDOMCell, TableMapType, TableCellNode } from '@lexical/table';
import {
  TableNode,
  $isTableRowNode,
  getTableElement,
  $isTableCellNode,
  getDOMCellFromTarget,
  $computeTableMapSkipCellCheck,
  $getTableRowIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
} from '@lexical/table';
import { mergeRegister, calculateZoomLevel } from '@lexical/utils';
import type { NodeKey, LexicalEditor } from 'lexical';
import { isHTMLElement, SKIP_SCROLL_INTO_VIEW_TAG, $getNearestNodeFromDOMNode } from 'lexical';
import * as React from 'react';
import { createPortal } from 'react-dom';

type PointerPosition = {
  x: number;
  y: number;
};

type PointerDraggingDirection = 'bottom' | 'right';

const MIN_ROW_HEIGHT = 33;
const MIN_COLUMN_WIDTH = 92;
const RESIZE_ZONE_WIDTH = 16;

function getCellNodeHeight(cell: TableCellNode, activeEditor: LexicalEditor) {
  const domCellNode = activeEditor.getElementByKey(cell.getKey());

  return domCellNode?.clientHeight;
}

function getCellColumnIndex(tableCellNode: TableCellNode, tableMap: TableMapType) {
  for (let row = 0; row < tableMap.length; row++) {
    for (let column = 0; column < tableMap[row].length; column++) {
      if (tableMap[row][column].cell === tableCellNode) {
        return column;
      }
    }
  }
}

function TableCellResizer({ editor }: { editor: LexicalEditor }) {
  const targetRef = React.useRef<HTMLElement | null>(null);
  const resizerRef = React.useRef<HTMLDivElement | null>(null);
  const tableRectRef = React.useRef<DOMRect | null>(null);
  const pointerStartPosRef = React.useRef<PointerPosition | null>(null);
  const [hasTable, setHasTable] = React.useState(false);
  const [pointerCurrentPos, setPointerCurrentPos] = React.useState<PointerPosition | null>(null);
  const [activeCell, setActiveCell] = React.useState<TableDOMCell | null>(null);
  const [draggingDirection, setDraggingDirection] = React.useState<PointerDraggingDirection | null>(null);
  const [hoveredDirection, setHoveredDirection] = React.useState<PointerDraggingDirection | null>(null);

  const resetState = React.useCallback(() => {
    setActiveCell(null);
    targetRef.current = null;
    setDraggingDirection(null);
    setHoveredDirection(null);
    pointerStartPosRef.current = null;
    tableRectRef.current = null;
  }, []);

  React.useEffect(() => {
    const tableKeys = new Set<NodeKey>();

    return mergeRegister(
      editor.registerMutationListener(TableNode, (nodeMutations) => {
        for (const [nodeKey, mutation] of nodeMutations) {
          if (mutation === 'destroyed') {
            tableKeys.delete(nodeKey);
          } else {
            tableKeys.add(nodeKey);
          }
        }

        setHasTable(tableKeys.size > 0);
      }),
      editor.registerNodeTransform(TableNode, (tableNode) => {
        if (tableNode.getColWidths()) {
          return tableNode;
        }

        tableNode.setColWidths(Array<number>(tableNode.getColumnCount()).fill(MIN_COLUMN_WIDTH));

        return tableNode;
      })
    );
  }, [editor]);

  React.useEffect(() => {
    if (!draggingDirection) {
      return;
    }

    document.body.setAttribute('data-table-resizing', '');

    return () => {
      document.body.removeAttribute('data-table-resizing');
    };
  }, [draggingDirection]);

  React.useEffect(() => {
    if (!hasTable) {
      return;
    }

    function onPointerMove(event: PointerEvent) {
      const target = event.target;

      if (!isHTMLElement(target)) {
        return;
      }

      if (draggingDirection) {
        event.preventDefault();
        event.stopPropagation();
        setPointerCurrentPos({ x: event.clientX, y: event.clientY });

        return;
      }

      if (resizerRef.current && resizerRef.current.contains(target)) {
        return;
      }

      if (targetRef.current !== target) {
        targetRef.current = target;
        const cell = getDOMCellFromTarget(target);

        if (cell && activeCell !== cell) {
          editor.read('latest', () => {
            const tableCellNode = $getNearestNodeFromDOMNode(cell.elem);

            if (!tableCellNode) {
              return;
            }

            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
            const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()));

            if (!tableElement) {
              return;
            }

            targetRef.current = target;
            tableRectRef.current = tableElement.getBoundingClientRect();
            setActiveCell(cell);
          });
        } else if (cell === null) {
          resetState();
        }
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'touch') {
        onPointerMove(event);
      }
    }

    const resizerContainer = resizerRef.current;

    resizerContainer?.addEventListener('pointermove', onPointerMove, { capture: true });

    return mergeRegister(
      editor.registerRootListener((rootElement, prevRootElement) => {
        prevRootElement?.removeEventListener('pointerdown', onPointerDown);
        prevRootElement?.removeEventListener('pointermove', onPointerMove);
        rootElement?.addEventListener('pointerdown', onPointerDown);
        rootElement?.addEventListener('pointermove', onPointerMove);
      }),
      () => {
        resizerContainer?.removeEventListener('pointermove', onPointerMove, { capture: true });
      }
    );
  }, [activeCell, draggingDirection, editor, resetState, hasTable]);

  const updateRowHeight = React.useCallback(
    (heightChange: number) => {
      if (!activeCell) {
        return;
      }

      editor.update(
        () => {
          const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);

          if (!$isTableCellNode(tableCellNode)) {
            return;
          }

          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const baseRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);
          const tableRows = tableNode.getChildren();
          const isFullRowMerge = tableCellNode.getColSpan() === tableNode.getColumnCount();
          const tableRowIndex = isFullRowMerge ? baseRowIndex : baseRowIndex + tableCellNode.getRowSpan() - 1;

          if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
            return;
          }

          const tableRow = tableRows[tableRowIndex];

          if (!$isTableRowNode(tableRow)) {
            return;
          }

          let height = tableRow.getHeight();

          if (height === undefined) {
            const rowCells = tableRow.getChildren().filter($isTableCellNode);

            height = Math.min(
              ...rowCells.map((cell) => {
                return getCellNodeHeight(cell, editor) ?? Infinity;
              })
            );
          }

          tableRow.setHeight(Math.max(height + heightChange, MIN_ROW_HEIGHT));
        },
        { tag: SKIP_SCROLL_INTO_VIEW_TAG }
      );
    },
    [activeCell, editor]
  );

  const updateColumnWidth = React.useCallback(
    (widthChange: number) => {
      if (!activeCell) {
        return;
      }

      editor.update(
        () => {
          const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);

          if (!$isTableCellNode(tableCellNode)) {
            return;
          }

          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const [tableMap] = $computeTableMapSkipCellCheck(tableNode, null, null);
          const columnIndex = getCellColumnIndex(tableCellNode, tableMap);

          if (columnIndex === undefined) {
            return;
          }

          const colWidths = tableNode.getColWidths();

          if (!colWidths) {
            return;
          }

          const width = colWidths[columnIndex];

          if (width === undefined) {
            return;
          }

          const newColWidths = [...colWidths];

          newColWidths[columnIndex] = Math.max(width + widthChange, MIN_COLUMN_WIDTH);
          tableNode.setColWidths(newColWidths);
        },
        { tag: SKIP_SCROLL_INTO_VIEW_TAG }
      );
    },
    [activeCell, editor]
  );

  const pointerUpHandler = React.useCallback(
    (direction: PointerDraggingDirection) => {
      function handler(event: PointerEvent) {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell || !pointerStartPosRef.current) {
          return;
        }

        const { x, y } = pointerStartPosRef.current;
        const zoom = calculateZoomLevel(event.target as Element);

        if (direction === 'bottom') {
          updateRowHeight((event.clientY - y) / zoom);
        } else {
          updateColumnWidth((event.clientX - x) / zoom);
        }

        resetState();
        document.removeEventListener('pointerup', handler);
      }

      return handler;
    },
    [activeCell, resetState, updateColumnWidth, updateRowHeight]
  );

  const toggleResize = React.useCallback(
    (direction: PointerDraggingDirection): React.PointerEventHandler<HTMLDivElement> => {
      return (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          return;
        }

        pointerStartPosRef.current = { x: event.clientX, y: event.clientY };
        setPointerCurrentPos(pointerStartPosRef.current);
        setDraggingDirection(direction);

        document.addEventListener('pointerup', pointerUpHandler(direction));
      };
    },
    [activeCell, pointerUpHandler]
  );

  const getResizers = React.useCallback(() => {
    if (!activeCell) {
      return { bottom: null, right: null };
    }

    const { height, left, top, width } = activeCell.elem.getBoundingClientRect();
    const zoom = calculateZoomLevel(activeCell.elem);
    const styles: Record<PointerDraggingDirection, React.CSSProperties> = {
      bottom: {
        backgroundColor: 'transparent',
        cursor: 'row-resize',
        height: `${RESIZE_ZONE_WIDTH}px`,
        left: `${window.scrollX + left}px`,
        top: `${window.scrollY + top + height - RESIZE_ZONE_WIDTH / 2}px`,
        width: `${width}px`,
      },
      right: {
        backgroundColor: 'transparent',
        cursor: 'col-resize',
        height: `${height}px`,
        left: `${window.scrollX + left + width - RESIZE_ZONE_WIDTH / 2}px`,
        top: `${window.scrollY + top}px`,
        width: `${RESIZE_ZONE_WIDTH}px`,
      },
    };
    const tableRect = tableRectRef.current;

    if (draggingDirection && pointerCurrentPos && tableRect) {
      if (draggingDirection === 'bottom') {
        styles.bottom.left = `${window.scrollX + tableRect.left}px`;
        styles.bottom.top = `${window.scrollY + pointerCurrentPos.y / zoom}px`;
        styles.bottom.height = '3px';
        styles.bottom.width = `${tableRect.width}px`;
      } else {
        styles.right.top = `${window.scrollY + tableRect.top}px`;
        styles.right.left = `${window.scrollX + pointerCurrentPos.x / zoom}px`;
        styles.right.width = '3px';
        styles.right.height = `${tableRect.height}px`;
      }

      styles[draggingDirection].backgroundColor = 'var(--primary)';
      styles[draggingDirection].mixBlendMode = 'unset';
    } else if (!draggingDirection && hoveredDirection === 'right') {
      const highlightStart = RESIZE_ZONE_WIDTH / 2 - 1;

      styles.right.backgroundImage = `linear-gradient(90deg, transparent ${highlightStart}px, var(--primary) ${highlightStart}px, var(--primary) ${highlightStart + 2}px, transparent ${highlightStart + 2}px)`;
      styles.right.mixBlendMode = 'unset';

      if (tableRect) {
        styles.right.top = `${window.scrollY + tableRect.top}px`;
        styles.right.height = `${tableRect.height}px`;
      }
    }

    return styles;
  }, [activeCell, draggingDirection, hoveredDirection, pointerCurrentPos]);

  const handlePointerEnter = React.useCallback(
    (direction: PointerDraggingDirection): React.PointerEventHandler<HTMLDivElement> => {
      return () => {
        if (!draggingDirection) {
          setHoveredDirection(direction);
        }
      };
    },
    [draggingDirection]
  );

  const handlePointerLeave = React.useCallback(() => {
    if (!draggingDirection) {
      setHoveredDirection(null);
    }
  }, [draggingDirection]);

  const resizerStyles = getResizers();

  return (
    <div ref={resizerRef} data-table-resizer>
      {activeCell !== null && (
        <>
          <div
            onPointerLeave={handlePointerLeave}
            className="editor-table-cell-resizer"
            onPointerDown={toggleResize('right')}
            style={resizerStyles.right || undefined}
            onPointerEnter={handlePointerEnter('right')}
          />
          <div
            className="editor-table-cell-resizer"
            onPointerDown={toggleResize('bottom')}
            style={resizerStyles.bottom || undefined}
          />
        </>
      )}
    </div>
  );
}

export default function TableCellResizerPlugin() {
  const [editor] = useLexicalComposerContext();

  return createPortal(<TableCellResizer editor={editor} />, document.body);
}
