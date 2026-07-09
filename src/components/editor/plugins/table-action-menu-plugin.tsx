'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { TableCellNode, TableSelection } from '@lexical/table';
import {
  $mergeCells,
  $unmergeCell,
  getTableElement,
  $getNodeTriplet,
  $isTableCellNode,
  $isTableSelection,
  TableCellHeaderStates,
  $insertTableRowAtSelection,
  $deleteTableRowAtSelection,
  $insertTableColumnAtSelection,
  $deleteTableColumnAtSelection,
  $computeTableMapSkipCellCheck,
  getTableObserverFromTableElement,
  $getTableCellNodeFromLexicalNode,
  $getTableRowIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableColumnIndexFromTableCellNode,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import type { ElementNode, BaseSelection } from 'lexical';
import {
  $isTextNode,
  $getSelection,
  $setSelection,
  $isElementNode,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from 'lexical';
import {
  Trash2Icon,
  ArrowUpIcon,
  PanelTopIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  PanelLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  FoldVerticalIcon,
  ArrowUpToLineIcon,
  TableCellsMergeIcon,
  TableCellsSplitIcon,
  ArrowDownToLineIcon,
} from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import type { Alignment } from '@/lib/constants/editor-toolbar-alignments';
import ELEMENT_FORMAT_OPTIONS from '@/lib/constants/editor-toolbar-alignments';
import $getSelectedTableCells from '@/lib/utils/get-selected-table-cells';

const MENU_BUTTON_SIZE = 20;
const MENU_BUTTON_MARGIN = 4;

const VERTICAL_ALIGN_OPTIONS = [
  { icon: ArrowUpToLineIcon, label: 'Align top', value: 'top' },
  { icon: FoldVerticalIcon, label: 'Align middle', value: 'middle' },
  { icon: ArrowDownToLineIcon, label: 'Align bottom', value: 'bottom' },
] as const;

function computeSelectionCount(selection: TableSelection) {
  const selectionShape = selection.getShape();

  return {
    columns: selectionShape.toX - selectionShape.fromX + 1,
    rows: selectionShape.toY - selectionShape.fromY + 1,
  };
}

function $canUnmerge() {
  const selection = $getSelection();

  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false;
  }

  const [cell] = $getNodeTriplet(selection.anchor);

  return cell.getColSpan() > 1 || cell.getRowSpan() > 1;
}

function $selectLastDescendant(node: ElementNode) {
  const lastDescendant = node.getLastDescendant();

  if ($isTextNode(lastDescendant)) {
    lastDescendant.select();
  } else if ($isElementNode(lastDescendant)) {
    lastDescendant.selectEnd();
  } else if (lastDescendant !== null) {
    lastDescendant.selectNext();
  }
}

export default function TableActionMenuPlugin({ anchor }: { anchor: HTMLElement }) {
  const [editor] = useLexicalComposerContext();
  const menuButtonRef = React.useRef<HTMLDivElement | null>(null);
  const cachedSelectionRef = React.useRef<BaseSelection | null>(null);
  const [tableCellNode, setTableCellNode] = React.useState<TableCellNode | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [selectionCounts, setSelectionCounts] = React.useState({ columns: 1, rows: 1 });
  const [canMergeCells, setCanMergeCells] = React.useState(false);
  const [canUnmergeCell, setCanUnmergeCell] = React.useState(false);
  const [hasRowHeader, setHasRowHeader] = React.useState(false);
  const [hasColumnHeader, setHasColumnHeader] = React.useState(false);

  const $moveMenu = React.useCallback(() => {
    const menu = menuButtonRef.current;
    const selection = $getSelection();
    const rootElement = editor.getRootElement();

    function disable() {
      if (menu) {
        menu.style.opacity = '0';
        menu.style.transform = 'translate(-10000px, -10000px)';
      }

      setTableCellNode(null);
    }

    if (selection === null || menu === null || rootElement === null) {
      return disable();
    }

    let tableCellNodeFromSelection: TableCellNode | null = null;

    if ($isRangeSelection(selection)) {
      const nativeSelection = window.getSelection();

      if (!nativeSelection || nativeSelection.rangeCount === 0 || !rootElement.contains(nativeSelection.anchorNode)) {
        return disable();
      }

      tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
    } else if ($isTableSelection(selection)) {
      tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
    }

    if (tableCellNodeFromSelection === null || !tableCellNodeFromSelection.isAttached()) {
      return disable();
    }

    const tableCellParentNodeDOM = editor.getElementByKey(tableCellNodeFromSelection.getKey());

    if (tableCellParentNodeDOM === null) {
      return disable();
    }

    const scrollableContainer = tableCellParentNodeDOM.closest('.editor-table-scrollable-wrapper');

    if (scrollableContainer) {
      const containerRect = scrollableContainer.getBoundingClientRect();
      const cellRect = tableCellParentNodeDOM.getBoundingClientRect();
      const buttonRight = cellRect.right - MENU_BUTTON_MARGIN;
      const buttonLeft = buttonRight - MENU_BUTTON_SIZE;

      if (buttonRight > containerRect.right || buttonLeft < containerRect.left) {
        return disable();
      }
    }

    const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNodeFromSelection);
    const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()));

    if (tableElement === null) {
      return disable();
    }

    const tableObserver = getTableObserverFromTableElement(tableElement);

    if (tableObserver !== null && tableObserver.isSelecting) {
      return disable();
    }

    setTableCellNode(tableCellNodeFromSelection);

    const cellRect = tableCellParentNodeDOM.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const top = cellRect.top - anchorRect.top + anchor.scrollTop + MENU_BUTTON_MARGIN;
    const left = cellRect.right - anchorRect.left + anchor.scrollLeft - MENU_BUTTON_SIZE - MENU_BUTTON_MARGIN;

    menu.style.opacity = '1';
    menu.style.transform = `translate(${left}px, ${top}px)`;
  }, [editor, anchor]);

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

    function callback() {
      timeoutId = undefined;
      editor.read('latest', $moveMenu);
    }

    function delayedCallback() {
      if (timeoutId === undefined) {
        timeoutId = setTimeout(callback, 0);
      }

      return false;
    }

    anchor.addEventListener('scroll', delayedCallback);
    window.addEventListener('resize', delayedCallback);

    return mergeRegister(
      editor.registerUpdateListener(delayedCallback),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, delayedCallback, COMMAND_PRIORITY_CRITICAL),
      editor.registerRootListener((rootElement, prevRootElement) => {
        prevRootElement?.removeEventListener('pointerup', delayedCallback);

        if (rootElement) {
          delayedCallback();
          rootElement.addEventListener('pointerup', delayedCallback);
        }
      }),
      () => {
        clearTimeout(timeoutId);
        anchor.removeEventListener('scroll', delayedCallback);
        window.removeEventListener('resize', delayedCallback);
      }
    );
  }, [editor, anchor, $moveMenu]);

  React.useEffect(() => {
    if (tableCellNode === null) {
      setIsMenuOpen(false);
    }
  }, [tableCellNode]);

  function handleMenuOpenChange(open: boolean) {
    if (open) {
      editor.read('latest', () => {
        const selection = $getSelection();

        cachedSelectionRef.current = selection ? selection.clone() : null;

        if ($isTableSelection(selection)) {
          const counts = computeSelectionCount(selection);

          setSelectionCounts(counts);
          setCanMergeCells(!selection.anchor.is(selection.focus) && (counts.columns > 1 || counts.rows > 1));
        } else {
          setSelectionCounts({ columns: 1, rows: 1 });
          setCanMergeCells(false);
        }

        setCanUnmergeCell($canUnmerge());

        if (tableCellNode !== null) {
          const headerStyles = tableCellNode.getLatest().getHeaderStyles();

          setHasRowHeader((headerStyles & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW);
          setHasColumnHeader((headerStyles & TableCellHeaderStates.COLUMN) === TableCellHeaderStates.COLUMN);
        }
      });
    }

    setIsMenuOpen(open);
  }

  function $restoreSelection() {
    const cached = cachedSelectionRef.current;

    if (cached) {
      $setSelection(cached.clone());
    }
  }

  const clearTableSelection = React.useCallback(() => {
    editor.update(() => {
      if (tableCellNode !== null && tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()));

        if (tableElement !== null) {
          const tableObserver = getTableObserverFromTableElement(tableElement);

          tableObserver?.$clearHighlight();
        }

        tableNode.markDirty();
        setTableCellNode(tableCellNode.getLatest());
      }

      $setSelection(null);
    });
  }, [editor, tableCellNode]);

  function mergeTableCellsAtSelection() {
    editor.update(() => {
      $restoreSelection();

      const selection = $getSelection();

      if (!$isTableSelection(selection)) {
        return;
      }

      const targetCell = $mergeCells(selection.getNodes().filter($isTableCellNode));

      if (targetCell) {
        $selectLastDescendant(targetCell);
      }
    });
    setIsMenuOpen(false);
  }

  function unmergeTableCellsAtSelection() {
    editor.update(() => {
      $restoreSelection();
      $unmergeCell();
    });
    clearTableSelection();
    setIsMenuOpen(false);
  }

  function insertRowAtSelection(shouldInsertAfter: boolean) {
    editor.update(() => {
      $restoreSelection();

      for (let i = 0; i < selectionCounts.rows; i++) {
        $insertTableRowAtSelection(shouldInsertAfter);
      }
    });
    setIsMenuOpen(false);
  }

  function insertColumnAtSelection(shouldInsertAfter: boolean) {
    editor.update(() => {
      $restoreSelection();

      for (let i = 0; i < selectionCounts.columns; i++) {
        $insertTableColumnAtSelection(shouldInsertAfter);
      }
    });
    setIsMenuOpen(false);
  }

  function deleteRowAtSelection() {
    editor.update(() => {
      $restoreSelection();
      $deleteTableRowAtSelection();
    });
    setIsMenuOpen(false);
  }

  function deleteColumnAtSelection() {
    editor.update(() => {
      $restoreSelection();
      $deleteTableColumnAtSelection();
    });
    setIsMenuOpen(false);
  }

  function deleteTableAtSelection() {
    if (tableCellNode === null) {
      return;
    }

    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      tableNode.remove();
    });
    clearTableSelection();
    setIsMenuOpen(false);
  }

  function formatVerticalAlign(value: 'top' | 'middle' | 'bottom') {
    editor.update(() => {
      $restoreSelection();
      $getSelectedTableCells($getSelection()).forEach((cell) => {
        cell.setVerticalAlign(value);
      });
    });
    setIsMenuOpen(false);
  }

  function formatHorizontalAlign(value: Alignment) {
    editor.update(() => {
      $restoreSelection();
      $getSelectedTableCells($getSelection()).forEach((cell) => {
        cell.getChildren().forEach((child) => {
          if ($isElementNode(child)) {
            child.setFormat(value);
          }
        });
      });
    });
    setIsMenuOpen(false);
  }

  function toggleRowIsHeader() {
    if (tableCellNode === null) {
      return;
    }

    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);
      const [gridMap] = $computeTableMapSkipCellCheck(tableNode, null, null);
      const rowCells = new Set<TableCellNode>();
      const newStyle = tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.ROW;

      for (let col = 0; col < gridMap[tableRowIndex].length; col++) {
        const mapCell = gridMap[tableRowIndex][col];

        if (mapCell?.cell && !rowCells.has(mapCell.cell)) {
          rowCells.add(mapCell.cell);
          mapCell.cell.setHeaderStyles(newStyle, TableCellHeaderStates.ROW);
        }
      }
    });
    clearTableSelection();
    setIsMenuOpen(false);
  }

  function toggleColumnIsHeader() {
    if (tableCellNode === null) {
      return;
    }

    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      const tableColumnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
      const [gridMap] = $computeTableMapSkipCellCheck(tableNode, null, null);
      const columnCells = new Set<TableCellNode>();
      const newStyle = tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.COLUMN;

      for (let row = 0; row < gridMap.length; row++) {
        const mapCell = gridMap[row][tableColumnIndex];

        if (mapCell?.cell && !columnCells.has(mapCell.cell)) {
          columnCells.add(mapCell.cell);
          mapCell.cell.setHeaderStyles(newStyle, TableCellHeaderStates.COLUMN);
        }
      }
    });
    clearTableSelection();
    setIsMenuOpen(false);
  }

  return createPortal(
    <div ref={menuButtonRef} className="absolute top-0 left-0 z-10 will-change-transform">
      {tableCellNode !== null && (
        <DropdownMenu modal={false} open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger
            asChild
            onPointerDown={(event) => {
              return event.preventDefault();
            }}
            onClick={(event) => {
              event.stopPropagation();
              handleMenuOpenChange(!isMenuOpen);
            }}
          >
            <Button size="icon" variant="secondary" aria-label="Table actions" className="size-5 rounded-sm border">
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            onCloseAutoFocus={(event) => {
              return event.preventDefault();
            }}
          >
            {(canMergeCells || canUnmergeCell) && (
              <>
                {canMergeCells && (
                  <DropdownMenuItem onClick={mergeTableCellsAtSelection}>
                    <TableCellsMergeIcon />
                    <span>Merge cells</span>
                  </DropdownMenuItem>
                )}
                {!canMergeCells && canUnmergeCell && (
                  <DropdownMenuItem onClick={unmergeTableCellsAtSelection}>
                    <TableCellsSplitIcon />
                    <span>Unmerge cells</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => {
                insertRowAtSelection(false);
              }}
            >
              <ArrowUpIcon />
              <span>Insert {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`} above</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                insertRowAtSelection(true);
              }}
            >
              <ArrowDownIcon />
              <span>Insert {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`} below</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                insertColumnAtSelection(false);
              }}
            >
              <ArrowLeftIcon />
              <span>Insert {selectionCounts.columns === 1 ? 'column' : `${selectionCounts.columns} columns`} left</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                insertColumnAtSelection(true);
              }}
            >
              <ArrowRightIcon />
              <span>
                Insert {selectionCounts.columns === 1 ? 'column' : `${selectionCounts.columns} columns`} right
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FoldVerticalIcon className="text-muted-foreground mr-2 size-4" />
                <span>Vertical align</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {VERTICAL_ALIGN_OPTIONS.map((option) => {
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        formatVerticalAlign(option.value);
                      }}
                    >
                      <option.icon />
                      <span>{option.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ELEMENT_FORMAT_OPTIONS.left.icon className="text-muted-foreground mr-2 size-4" />
                <span>Horizontal align</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(Object.keys(ELEMENT_FORMAT_OPTIONS) as Alignment[]).map((alignment) => {
                  const { icon: Icon, name } = ELEMENT_FORMAT_OPTIONS[alignment];

                  return (
                    <DropdownMenuItem
                      key={alignment}
                      onClick={() => {
                        formatHorizontalAlign(alignment);
                      }}
                    >
                      <Icon />
                      <span>{name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleRowIsHeader}>
              <PanelTopIcon />
              <span>{hasRowHeader ? 'Remove' : 'Add'} row header</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleColumnIsHeader}>
              <PanelLeftIcon />
              <span>{hasColumnHeader ? 'Remove' : 'Add'} column header</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={deleteRowAtSelection}>
              <Trash2Icon />
              <span>Delete row</span>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={deleteColumnAtSelection}>
              <Trash2Icon />
              <span>Delete column</span>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={deleteTableAtSelection}>
              <Trash2Icon />
              <span>Delete table</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>,
    anchor
  );
}
