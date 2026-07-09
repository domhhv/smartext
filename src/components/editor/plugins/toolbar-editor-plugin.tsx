import { useUser } from '@clerk/nextjs';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $convertToMarkdownString, $convertFromMarkdownString } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $patchStyleText } from '@lexical/selection';
import { $isTableCellNode, INSERT_TABLE_COMMAND } from '@lexical/table';
import * as Sentry from '@sentry/nextjs';
import {
  REDO_COMMAND,
  UNDO_COMMAND,
  HISTORIC_TAG,
  $getNodeByKey,
  $getSelection,
  $addUpdateTag,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
  SKIP_DOM_SELECTION_TAG,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import {
  XIcon,
  BoldIcon,
  CodeIcon,
  ListIcon,
  UndoIcon,
  RedoIcon,
  LinkIcon,
  SaveIcon,
  QuoteIcon,
  TableIcon,
  IndentIcon,
  ItalicIcon,
  EraserIcon,
  UploadIcon,
  HeadingIcon,
  BaselineIcon,
  DownloadIcon,
  UnderlineIcon,
  PaintRollerIcon,
  ChevronDownIcon,
  TextInitialIcon,
  PaintBucketIcon,
  TypeOutlineIcon,
  LoaderCircleIcon,
  StrikethroughIcon,
  MessageSquareIcon,
  BrushCleaningIcon,
  IndentDecreaseIcon,
} from 'lucide-react';
import posthog from 'posthog-js';
import * as React from 'react';
import { toast } from 'sonner';

import EditorColorPicker from '@/components/custom/editor-color-picker';
import FontSizeInput from '@/components/custom/font-size-input';
import Shortcut from '@/components/custom/shortcut';
import TableSizePicker from '@/components/custom/table-size-picker';
import TooltipButton from '@/components/custom/tooltip-button';
import { ChatStatusContext } from '@/components/providers/chat-status-provider';
import { useDocument } from '@/components/providers/document-provider';
import { ToolbarStateContext } from '@/components/providers/editor-toolbar-state-provider';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { updateDocument } from '@/lib/actions/document.actions';
import OPEN_INSERT_TABLE_POPOVER_COMMAND from '@/lib/constants/editor-custom-commands';
import { default as KBD } from '@/lib/constants/editor-shortcuts';
import type { Alignment } from '@/lib/constants/editor-toolbar-alignments';
import ELEMENT_FORMAT_OPTIONS from '@/lib/constants/editor-toolbar-alignments';
import HEADINGS from '@/lib/constants/editor-toolbar-headings';
import LISTS from '@/lib/constants/editor-toolbar-lists';
import TEXT_FORMAT_OPTIONS from '@/lib/constants/editor-toolbar-text-formats';
import ENHANCED_LEXICAL_TRANSFORMERS from '@/lib/constants/enhanced-lexical-transformers';
import useCssVar from '@/lib/hooks/use-css-var';
import useDragToScroll from '@/lib/hooks/use-drag-to-scroll';
import useEditorToolbarSync from '@/lib/hooks/use-editor-toolbar-sync';
import useOnClickOutside from '@/lib/hooks/use-on-click-outside';
import useTooltipGroup from '@/lib/hooks/use-tooltip-group';
import cssColorToRgba from '@/lib/utils/css-color-to-rgba';
import {
  formatQuote,
  clearEditor,
  formatHeading,
  updateFontSize,
  formatCheckList,
  formatParagraph,
  clearFormatting,
  formatBulletList,
  formatNumberedList,
} from '@/lib/utils/editor-helpers';
import getErrorMessage from '@/lib/utils/get-error-message';
import $getSelectedTableCells from '@/lib/utils/get-selected-table-cells';

const FONT_FAMILIES = [
  'Arial',
  'Courier New',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Ubuntu',
  'Montserrat',
  'Roboto',
  'Open Sans',
  'Lora',
] as const;

export default function ToolbarEditorPlugin() {
  const [mounted, setMounted] = React.useState(false);
  const { isSignedIn } = useUser();
  const [editor] = useLexicalComposerContext();
  const { toolbarState } = React.use(ToolbarStateContext);
  const { isChatVisible, setIsChatVisible } = React.use(ChatStatusContext);
  const tooltipGroup = useTooltipGroup();
  const toolbarRef = useDragToScroll<HTMLDivElement>();
  const { activeDocument, closeActiveDocument, hasUnsavedEditorChanges, isEditorEmpty, openDocumentDialog } =
    useDocument();
  const [isFontColorPickerOpen, setIsFontColorPickerOpen] = React.useState(false);
  const [isBackgroundColorPickerOpen, setIsBackgroundColorPickerOpen] = React.useState(false);
  const [isHeadingsDropdownOpen, setIsHeadingsDropdownOpen] = React.useState(false);
  const [isListsDropdownOpen, setIsListsDropdownOpen] = React.useState(false);
  const [isTextFormatDropdownOpen, setIsTextFormatDropdownOpen] = React.useState(false);
  const [isTableSizePickerOpen, setIsTableSizePickerOpen] = React.useState(false);
  const [isCellBackgroundColorPickerOpen, setIsCellBackgroundColorPickerOpen] = React.useState(false);
  const [fontColor, setFontColor] = React.useState('');
  const [backgroundColor, setBackgroundColor] = React.useState('');
  const [cellBackgroundColor, setCellBackgroundColor] = React.useState('');
  const targetCellKeysRef = React.useRef<string[]>([]);
  const previousCellBackgroundsRef = React.useRef(new Map<string, null | string>());
  const [isSavingActiveDocument, setIsSavingActiveDocument] = React.useState(false);
  useEditorToolbarSync();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    return editor.registerCommand(
      OPEN_INSERT_TABLE_POPOVER_COMMAND,
      () => {
        setIsTableSizePickerOpen(true);

        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor]);

  const foreground = useCssVar('--foreground');
  const background = useCssVar('--background');

  const currentForegroundColor = React.useMemo(() => {
    const [r, g, b, a] = cssColorToRgba(foreground);

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }, [foreground]);

  const currentBackgroundColor = React.useMemo(() => {
    const [r, g, b, a] = cssColorToRgba(background);

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }, [background]);

  const fontColorPickerContainer = React.useRef<HTMLDivElement>(null);
  const backgroundColorPickerContainer = React.useRef<HTMLDivElement>(null);

  function handleClickOutsideFontColorPicker(event: MouseEvent | TouchEvent | FocusEvent) {
    if (
      !isFontColorPickerOpen ||
      (event.target instanceof HTMLElement && event.target.dataset.slot === 'select-item')
    ) {
      return;
    }

    handleFontColorChange(fontColor, false);
    setIsFontColorPickerOpen(false);
  }

  function handleClickOutsideBackgroundColorPicker(event: MouseEvent | TouchEvent | FocusEvent) {
    if (
      !isBackgroundColorPickerOpen ||
      (event.target instanceof HTMLElement && event.target.dataset.slot === 'select-item')
    ) {
      return;
    }

    handleBackgroundColorChange(backgroundColor, false);
    setIsBackgroundColorPickerOpen(false);
  }

  useOnClickOutside(backgroundColorPickerContainer, handleClickOutsideBackgroundColorPicker);

  useOnClickOutside(fontColorPickerContainer, handleClickOutsideFontColorPicker);

  const applyStyleText = React.useCallback(
    (property: 'color' | 'background-color', value: string, skipHistoryStack?: boolean) => {
      editor.update(() => {
        const selection = $getSelection();

        if (selection !== null && $isRangeSelection(selection)) {
          const nodes = selection.getNodes();
          const fontColors = new Set<string>();
          const backgroundColors = new Set<string>();

          nodes.forEach((node) => {
            const element = editor.getElementByKey(node.getKey());

            if (element && element instanceof Element) {
              const { backgroundColor, color } = window.getComputedStyle(element);

              fontColors.add(color);
              backgroundColors.add(backgroundColor);
            }
          });

          if (property === 'color' && value === currentForegroundColor && fontColors.size > 1 && !skipHistoryStack) {
            return;
          }

          if (
            property === 'background-color' &&
            value === currentBackgroundColor &&
            backgroundColors.size > 1 &&
            !skipHistoryStack
          ) {
            return;
          }

          if (skipHistoryStack) {
            $addUpdateTag(HISTORIC_TAG);
          }

          $patchStyleText(selection, { [property]: value });
        }
      });
    },
    [editor, currentBackgroundColor, currentForegroundColor]
  );

  function handleFontColorChange(newColor: string, skipHistoryStack: boolean) {
    if (!skipHistoryStack && newColor === currentForegroundColor) {
      return;
    }

    setFontColor(newColor);
    applyStyleText('color', newColor, skipHistoryStack);
  }

  function handleBackgroundColorChange(newColor: string, skipHistoryStack: boolean) {
    if (!skipHistoryStack && newColor === currentBackgroundColor) {
      return;
    }

    setBackgroundColor(newColor);
    applyStyleText('background-color', newColor, skipHistoryStack);
  }

  React.useEffect(() => {
    setFontColor(toolbarState.fontColor);
  }, [toolbarState.fontColor]);

  React.useEffect(() => {
    setBackgroundColor(toolbarState.backgroundColor);
  }, [toolbarState.backgroundColor]);

  React.useEffect(() => {
    setCellBackgroundColor(toolbarState.tableCellBackgroundColor);
  }, [toolbarState.tableCellBackgroundColor]);

  const applyCellBackgroundEmphasis = React.useCallback(() => {
    targetCellKeysRef.current.forEach((key) => {
      const element = editor.getElementByKey(key);

      if (element) {
        element.style.outline = '2px dashed var(--primary)';
        element.style.outlineOffset = '-2px';
      }
    });
  }, [editor]);

  const clearCellBackgroundEmphasis = React.useCallback(() => {
    targetCellKeysRef.current.forEach((key) => {
      const element = editor.getElementByKey(key);

      if (element) {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }
    });
  }, [editor]);

  const cancelCellBackgroundColor = React.useCallback(() => {
    editor.update(
      () => {
        $addUpdateTag(HISTORIC_TAG);
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        previousCellBackgroundsRef.current.forEach((background, key) => {
          const cell = $getNodeByKey(key);

          if ($isTableCellNode(cell)) {
            cell.setBackgroundColor(background);
          }
        });
      },
      { onUpdate: clearCellBackgroundEmphasis }
    );
    setIsCellBackgroundColorPickerOpen(false);
  }, [editor, clearCellBackgroundEmphasis]);

  React.useEffect(() => {
    if (!toolbarState.isTableCell && isCellBackgroundColorPickerOpen) {
      cancelCellBackgroundColor();
    }
  }, [toolbarState.isTableCell, isCellBackgroundColorPickerOpen, cancelCellBackgroundColor]);

  function handleCellBackgroundColorOpenChange(open: boolean) {
    if (!open) {
      cancelCellBackgroundColor();

      return;
    }

    editor.read('latest', () => {
      const cells = $getSelectedTableCells($getSelection());

      targetCellKeysRef.current = cells.map((cell) => {
        return cell.getKey();
      });
      previousCellBackgroundsRef.current = new Map(
        cells.map((cell) => {
          return [cell.getKey(), cell.getBackgroundColor()];
        })
      );
    });
    applyCellBackgroundEmphasis();
    setIsFontColorPickerOpen(false);
    setIsBackgroundColorPickerOpen(false);
    setIsCellBackgroundColorPickerOpen(true);
  }

  function handleCellBackgroundColorChange(value: string, skipHistoryStack: boolean) {
    if (!isCellBackgroundColorPickerOpen || (!skipHistoryStack && value === cellBackgroundColor)) {
      return;
    }

    setCellBackgroundColor(value);
    editor.update(
      () => {
        if (skipHistoryStack) {
          $addUpdateTag(HISTORIC_TAG);
        }

        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        targetCellKeysRef.current.forEach((key) => {
          const cell = $getNodeByKey(key);

          if ($isTableCellNode(cell)) {
            cell.setBackgroundColor(value);
          }
        });
      },
      { onUpdate: applyCellBackgroundEmphasis }
    );
  }

  function applyCellBackgroundColor() {
    clearCellBackgroundEmphasis();
    setIsCellBackgroundColorPickerOpen(false);
  }

  const applyFontColor = React.useCallback(() => {
    setIsFontColorPickerOpen(false);
    applyStyleText('color', fontColor, true);
  }, [applyStyleText, fontColor]);

  const applyBackgroundColor = React.useCallback(() => {
    setIsBackgroundColorPickerOpen(false);
    applyStyleText('background-color', backgroundColor, true);
  }, [applyStyleText, backgroundColor]);

  const applyFontFamily = React.useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();

        if (selection !== null) {
          $patchStyleText(selection, {
            ['font-family']: option,
          });
        }
      });
    },
    [editor]
  );

  const handleFontSizeChange = React.useCallback(
    (newSize: string) => {
      updateFontSize(editor, `${newSize}px`);
    },
    [editor]
  );

  const handleFontColorOpenChange = React.useCallback((open: boolean) => {
    setIsFontColorPickerOpen(open);
    setIsBackgroundColorPickerOpen(false);
  }, []);

  const handleBackgroundColorOpenChange = React.useCallback((open: boolean) => {
    setIsBackgroundColorPickerOpen(open);
    setIsFontColorPickerOpen(false);
  }, []);

  React.useEffect(() => {
    if (!isFontColorPickerOpen && !isBackgroundColorPickerOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      if (isFontColorPickerOpen) {
        setIsFontColorPickerOpen(false);
      }

      if (isBackgroundColorPickerOpen) {
        setIsBackgroundColorPickerOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFontColorPickerOpen, isBackgroundColorPickerOpen]);

  const handleSave = React.useCallback(async () => {
    if (activeDocument) {
      try {
        setIsSavingActiveDocument(true);

        await updateDocument(activeDocument.id, {
          content: JSON.stringify(editor.getEditorState()),
        });
        posthog.capture('document_updated', {
          documentId: activeDocument.id,
        });
        toast.success('Document saved successfully');
      } catch (error) {
        Sentry.captureException(error);
        console.error(`Error ${activeDocument.title || 'Untitled Document'} document: `, error);
        toast.error(`Error ${activeDocument.title || 'Untitled Document'} document`, {
          description: getErrorMessage(error),
        });
      } finally {
        setIsSavingActiveDocument(false);
      }
    } else {
      openDocumentDialog();
    }
  }, [activeDocument, editor, openDocumentDialog]);

  const markdownFileInputRef = React.useRef<HTMLInputElement>(null);

  const downloadEditorMarkdown = React.useCallback(() => {
    editor.read(() => {
      const markdown = $convertToMarkdownString(ENHANCED_LEXICAL_TRANSFORMERS, undefined, true);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeDocument?.title || 'Untitled Document'}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Markdown file exported successfully');
    });
  }, [editor, activeDocument?.title]);

  const importMarkdown = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;

        editor.update(() => {
          $convertFromMarkdownString(content, ENHANCED_LEXICAL_TRANSFORMERS, undefined, true);
        });

        toast.success(`Imported "${file.name}" successfully`);
      };

      reader.onerror = () => {
        toast.error('Failed to read the file');
      };

      reader.readAsText(file);

      event.target.value = '';
    },
    [editor]
  );

  return (
    <TooltipProvider>
      <div
        ref={toolbarRef}
        onMouseLeave={tooltipGroup.onGroupMouseLeave}
        className="scrollbar-hide sticky top-0 z-10 flex items-center gap-2 overflow-x-auto p-2"
      >
        <TooltipButton
          {...tooltipGroup.getTooltipProps()}
          variant={isChatVisible ? 'secondary' : 'ghost'}
          tooltip={isChatVisible ? 'Hide chat' : 'Show chat'}
          onClick={() => {
            setIsChatVisible((prev) => {
              return !prev;
            });
          }}
        >
          <MessageSquareIcon />
        </TooltipButton>

        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        {!!activeDocument && (
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            variant="secondary"
            tooltip="Close this file"
            onClick={closeActiveDocument}
            disabled={isSavingActiveDocument}
          >
            <XIcon />
          </TooltipButton>
        )}

        <TooltipButton
          {...tooltipGroup.getTooltipProps()}
          variant="secondary"
          onClick={handleSave}
          disabled={isSavingActiveDocument || !hasUnsavedEditorChanges || !isSignedIn}
          tooltip={
            activeDocument
              ? `Save changes to ${activeDocument.title || 'Untitled Document'}`
              : 'Save this content as a new document'
          }
        >
          {isSavingActiveDocument ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
        </TooltipButton>
        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />
        <TooltipButton
          {...tooltipGroup.getTooltipProps()}
          variant="secondary"
          tooltip="Clear editor"
          shortcut={KBD.CLEAR_EDITOR}
          onClick={clearEditor.bind(null, editor)}
          disabled={isSavingActiveDocument || isEditorEmpty}
        >
          <BrushCleaningIcon />
        </TooltipButton>
        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        <ButtonGroup>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Undo"
            variant="secondary"
            shortcut={KBD.UNDO}
            disabled={!toolbarState.canUndo}
            onClick={() => {
              editor.dispatchCommand(UNDO_COMMAND, undefined);
            }}
          >
            <UndoIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Redo"
            variant="secondary"
            shortcut={KBD.REDO}
            disabled={!toolbarState.canRedo}
            onClick={() => {
              editor.dispatchCommand(REDO_COMMAND, undefined);
            }}
          >
            <RedoIcon />
          </TooltipButton>
        </ButtonGroup>

        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        <ButtonGroup>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Bold"
            shortcut={KBD.BOLD}
            variant={toolbarState.isBold ? 'secondary' : 'ghost'}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
          >
            <BoldIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Italic"
            shortcut={KBD.ITALIC}
            variant={toolbarState.isItalic ? 'secondary' : 'ghost'}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
          >
            <ItalicIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Underline"
            shortcut={KBD.UNDERLINE}
            variant={toolbarState.isUnderline ? 'secondary' : 'ghost'}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
          >
            <UnderlineIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Strikethrough"
            shortcut={KBD.STRIKETHROUGH}
            variant={toolbarState.isStrikethrough ? 'secondary' : 'ghost'}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
            }}
          >
            <StrikethroughIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Code"
            shortcut={KBD.CODE}
            variant={toolbarState.isCode ? 'secondary' : 'ghost'}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
            }}
          >
            <CodeIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            tooltip="Link"
            shortcut={KBD.INSERT_LINK}
            variant={toolbarState.isLink ? 'secondary' : 'ghost'}
            onClick={() => {
              if (!toolbarState.isLink) {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
              }
            }}
          >
            <LinkIcon />
          </TooltipButton>
        </ButtonGroup>

        <Popover open={isTableSizePickerOpen} onOpenChange={setIsTableSizePickerOpen}>
          <Tooltip delayDuration={tooltipGroup.getTooltipProps().delayDuration}>
            <TooltipTrigger asChild onMouseEnter={tooltipGroup.getTooltipProps().onMouseEnter}>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="shrink-0" aria-label="Insert table">
                  <TableIcon />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2 p-2 pr-2.5">
              Insert table <Shortcut keys={KBD.INSERT_TABLE} />
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-fit">
            <TableSizePicker
              onSelect={(rows, columns) => {
                editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                  columns: String(columns),
                  includeHeaders: { columns: false, rows: true },
                  rows: String(rows),
                });
                setIsTableSizePickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Separator className="h-6!" orientation="vertical" />

        {mounted ? (
          <Select onValueChange={applyFontFamily} value={toolbarState.fontFamily || 'Arial'}>
            <SelectTrigger size="sm" variant="secondary" className="text-secondary-foreground w-40 shrink-0">
              <SelectValue placeholder="Font family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Courier New">Courier New</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="Verdana">Verdana</SelectItem>
              <SelectItem value="Ubuntu">Ubuntu</SelectItem>
              <SelectItem value="Montserrat">Montserrat</SelectItem>
              <SelectItem value="Roboto">Roboto</SelectItem>
              <SelectItem value="Open Sans">Open Sans</SelectItem>
              <SelectItem value="Lora">Lora</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="relative w-40 shrink-0">
            <select
              value={toolbarState.fontFamily || 'Arial'}
              onChange={(event) => {
                applyFontFamily(event.target.value);
              }}
              className="bg-secondary text-secondary-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full appearance-none items-center rounded-md px-3 py-1 pr-8 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              {FONT_FAMILIES.map((fontFamily) => {
                return (
                  <option key={fontFamily} value={fontFamily}>
                    {fontFamily}
                  </option>
                );
              })}
            </select>
            <ChevronDownIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-50" />
          </div>
        )}

        <FontSizeInput
          className="shrink-0"
          value={toolbarState.fontSize}
          onChange={handleFontSizeChange}
          onMouseEnter={tooltipGroup.getTooltipProps().onMouseEnter}
          delayDuration={tooltipGroup.getTooltipProps().delayDuration}
        />

        <DropdownMenu open={isHeadingsDropdownOpen} onOpenChange={setIsHeadingsDropdownOpen}>
          <DropdownMenuTrigger
            asChild
            className="w-40 shrink-0 justify-between"
            onPointerDown={(e) => {
              return e.preventDefault();
            }}
            onClick={() => {
              return setIsHeadingsDropdownOpen((prev) => {
                return !prev;
              });
            }}
          >
            <Button size="sm" variant="secondary">
              <HeadingIcon className="mr-1 h-4 w-4" />
              {HEADINGS.find((h) => {
                return h.value === toolbarState.blockType;
              })?.label || 'Normal text'}
              <ChevronDownIcon className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {HEADINGS.map((heading) => {
              return (
                <DropdownMenuItem
                  key={heading.value}
                  className="flex justify-between gap-4"
                  onClick={() => {
                    formatHeading(editor, toolbarState.blockType, heading.value);
                  }}
                >
                  <div className="flex items-center">
                    <heading.icon className="mr-2 h-4 w-4" />
                    <span>{heading.label}</span>
                  </div>
                  <Shortcut keys={heading.shortcut} />
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex justify-between gap-4"
              onClick={() => {
                return formatParagraph(editor);
              }}
            >
              <div className="flex items-center gap-2">
                <TextInitialIcon />
                <span>Normal text</span>
              </div>
              <Shortcut keys={KBD.NORMAL} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={isListsDropdownOpen} onOpenChange={setIsListsDropdownOpen}>
          <DropdownMenuTrigger
            asChild
            className="w-44 shrink-0 justify-between"
            onPointerDown={(e) => {
              return e.preventDefault();
            }}
            onClick={() => {
              return setIsListsDropdownOpen((prev) => {
                return !prev;
              });
            }}
          >
            <Button size="sm" variant="secondary">
              <ListIcon className="mr-1 h-4 w-4" />
              {LISTS.find((l) => {
                return l.value === toolbarState.blockType;
              })?.label || 'Insert list'}
              <ChevronDownIcon className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {LISTS.map((list) => {
              return (
                <DropdownMenuItem
                  key={list.value}
                  className="flex justify-between gap-4"
                  onClick={() => {
                    if (list.value === 'bullet') {
                      formatBulletList(editor, toolbarState.blockType);
                    } else if (list.value === 'number') {
                      formatNumberedList(editor, toolbarState.blockType);
                    } else if (list.value === 'check') {
                      formatCheckList(editor, toolbarState.blockType);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <list.icon className="mr-2 h-4 w-4" />
                    <span>{list.label}</span>
                  </div>
                  <Shortcut keys={list.shortcut} />
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        <Popover open={isFontColorPickerOpen} onOpenChange={handleFontColorOpenChange}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" aria-label="Font color" className="shrink-0 gap-0 space-x-2">
              <BaselineIcon strokeWidth="2.5px" />
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            asChild
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
          >
            <div ref={fontColorPickerContainer} className="w-[305px] space-y-4">
              <div className="text-muted-foreground flex items-center justify-between">
                <p className="text-sm">Font color</p>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setIsFontColorPickerOpen(false);
                  }}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <EditorColorPicker value={fontColor} onChange={handleFontColorChange} />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsFontColorPickerOpen(false);
                }}
              >
                <div className="rounded border border-current px-1 py-0.5 text-xs">Esc</div>
                <span>Cancel</span>
              </Button>
              <Button className="w-full" onClick={applyFontColor}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={isBackgroundColorPickerOpen} onOpenChange={handleBackgroundColorOpenChange}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" aria-label="Background color" className="shrink-0 gap-0 space-x-2">
              <PaintBucketIcon strokeWidth="2.5px" />
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            asChild
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
          >
            <div className="w-[305px] space-y-4" ref={backgroundColorPickerContainer}>
              <div className="text-muted-foreground flex items-center justify-between">
                <p className="text-sm">Background color</p>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setIsBackgroundColorPickerOpen(false);
                  }}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <EditorColorPicker value={backgroundColor} onChange={handleBackgroundColorChange} />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsBackgroundColorPickerOpen(false);
                }}
              >
                <div className="rounded border border-current px-1 py-0.5 text-xs">Esc</div>
                <span>Cancel</span>
              </Button>
              <Button className="w-full" onClick={applyBackgroundColor}>
                <span>Apply</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {toolbarState.isTableCell && (
          <Popover open={isCellBackgroundColorPickerOpen} onOpenChange={handleCellBackgroundColorOpenChange}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                aria-label="Cell background color"
                className="shrink-0 gap-0 space-x-2"
              >
                <PaintRollerIcon strokeWidth="2.5px" />
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent asChild>
              <div className="w-[305px] space-y-4">
                <div className="text-muted-foreground flex items-center justify-between">
                  <p className="text-sm">Cell background color</p>
                  <Button size="xs" variant="ghost" onClick={cancelCellBackgroundColor}>
                    <XIcon className="size-4" />
                  </Button>
                </div>
                <EditorColorPicker value={cellBackgroundColor} onChange={handleCellBackgroundColorChange} />
                <Button variant="outline" className="w-full" onClick={cancelCellBackgroundColor}>
                  <div className="rounded border border-current px-1 py-0.5 text-xs">Esc</div>
                  <span>Cancel</span>
                </Button>
                <Button className="w-full" onClick={applyCellBackgroundColor}>
                  <span>Apply</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        <ButtonGroup>
          {(Object.keys(ELEMENT_FORMAT_OPTIONS) as Alignment[]).map((alignment) => {
            const { icon: Icon, name, shortcut } = ELEMENT_FORMAT_OPTIONS[alignment];

            return (
              <TooltipButton
                key={alignment}
                {...tooltipGroup.getTooltipProps()}
                tooltip={name}
                shortcut={shortcut}
                variant={toolbarState.elementFormat === alignment ? 'secondary' : 'ghost'}
                onClick={() => {
                  editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
                }}
              >
                <Icon />
              </TooltipButton>
            );
          })}
        </ButtonGroup>

        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        <ButtonGroup>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            variant="ghost"
            tooltip="Outdent"
            shortcut={KBD.OUTDENT}
            onClick={() => {
              editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
            }}
          >
            <IndentDecreaseIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            variant="ghost"
            tooltip="Indent"
            shortcut={KBD.INDENT}
            onClick={() => {
              editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
            }}
          >
            <IndentIcon />
          </TooltipButton>
        </ButtonGroup>

        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        <TooltipButton
          {...tooltipGroup.getTooltipProps()}
          tooltip="Quote"
          shortcut={KBD.QUOTE}
          variant={toolbarState.isQuote ? 'secondary' : 'ghost'}
          onClick={() => {
            formatQuote(editor, toolbarState.blockType);
          }}
        >
          <QuoteIcon />
        </TooltipButton>

        <DropdownMenu open={isTextFormatDropdownOpen} onOpenChange={setIsTextFormatDropdownOpen}>
          <DropdownMenuTrigger
            asChild
            className="w-44 shrink-0 justify-between"
            onPointerDown={(e) => {
              return e.preventDefault();
            }}
            onClick={() => {
              return setIsTextFormatDropdownOpen((prev) => {
                return !prev;
              });
            }}
          >
            <Button size="sm" variant="secondary">
              <TypeOutlineIcon className="mr-1 h-4 w-4" />
              {Object.entries(TEXT_FORMAT_OPTIONS).find(([, option]) => {
                return toolbarState[option.key];
              })?.[1]?.name || 'Text format'}
              <ChevronDownIcon className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(Object.keys(TEXT_FORMAT_OPTIONS) as Array<keyof typeof TEXT_FORMAT_OPTIONS>).map((format) => {
              const option = TEXT_FORMAT_OPTIONS[format];
              const Icon = option.icon;

              return (
                <DropdownMenuItem
                  key={format}
                  className="flex justify-between gap-4"
                  onClick={() => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format as TextFormatType);
                  }}
                >
                  <div className="flex items-center">
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{option.name}</span>
                  </div>
                  <Shortcut keys={option.shortcut} />
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex justify-between gap-4"
              onClick={() => {
                clearFormatting(editor);
              }}
            >
              <div className="flex items-center gap-2">
                <EraserIcon className="h-4 w-4" />
                <span>Clear formatting</span>
              </div>
              <Shortcut keys={KBD.CLEAR_FORMATTING} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6! shrink-0 self-center justify-self-center" />

        <input
          type="file"
          className="hidden"
          onChange={importMarkdown}
          ref={markdownFileInputRef}
          accept=".md,.markdown,text/markdown"
        />

        <ButtonGroup>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            variant="ghost"
            tooltip="Import Markdown"
            onClick={() => {
              markdownFileInputRef.current?.click();
            }}
          >
            <UploadIcon />
          </TooltipButton>
          <TooltipButton
            {...tooltipGroup.getTooltipProps()}
            variant="ghost"
            tooltip="Export as Markdown"
            onClick={downloadEditorMarkdown}
          >
            <DownloadIcon />
          </TooltipButton>
        </ButtonGroup>
      </div>
    </TooltipProvider>
  );
}
