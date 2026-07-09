import { $isLinkNode } from '@lexical/link';
import { $isListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isHeadingNode } from '@lexical/rich-text';
import { $getSelectionStyleValueForProperty } from '@lexical/selection';
import { $isTableSelection, $getTableCellNodeFromLexicalNode } from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isElementNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
} from 'lexical';
import * as React from 'react';

import { ToolbarStateContext } from '@/components/providers/editor-toolbar-state-provider';
import { blockTypeToBlockName } from '@/lib/constants/initial-editor-toolbar-state';
import useCssVar from '@/lib/hooks/use-css-var';
import cssColorToRgba from '@/lib/utils/css-color-to-rgba';
import { getSelectedNode, normalizeFormatType, $findTopLevelElement } from '@/lib/utils/editor-helpers';

export default function useEditorToolbarSync() {
  const [editor] = useLexicalComposerContext();
  const { updateToolbarState } = React.use(ToolbarStateContext);
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

  const $updateToolbar = React.useCallback(() => {
    const selection = $getSelection();
    const nativeSelection = window.getSelection();
    const selectedElement = nativeSelection?.focusNode?.parentElement;
    const [selectedNode] = selection?.getNodes() ?? [];

    if (selectedNode && selectedElement) {
      const { fontFamily, fontSize } = window.getComputedStyle(selectedElement);

      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        const fontSizes = new Set<string>();
        const fontFamilies = new Set<string>();
        const fontColors = new Set<string>();
        const backgroundColors = new Set<string>();

        nodes.forEach((node) => {
          const element = editor.getElementByKey(node.getKey());

          if (element && element instanceof Element) {
            const computedStyle = window.getComputedStyle(element);
            fontSizes.add(computedStyle.fontSize.replace('px', ''));

            const computedFontFamily = computedStyle.fontFamily;
            const defaultFontFamily = $isHeadingNode(node.getTopLevelElement()) ? 'Ubuntu' : 'Montserrat';

            if (computedFontFamily.includes(defaultFontFamily)) {
              fontFamilies.add(defaultFontFamily);
            } else {
              fontFamilies.add(computedFontFamily.split(',')[0].replace(/['"]/g, ''));
            }

            fontColors.add(computedStyle.color);
            backgroundColors.add(computedStyle.backgroundColor);
          }
        });

        if (fontSizes.size > 1) {
          updateToolbarState('fontSize', '');
        } else {
          const fontSizeNumeric = fontSize.replace('px', '');
          updateToolbarState('fontSize', fontSizeNumeric);
        }

        if (fontFamilies.size > 1) {
          updateToolbarState('fontFamily', '');
        } else {
          const defaultFontFamily = $isHeadingNode(selectedNode.getTopLevelElement()) ? 'Ubuntu' : 'Montserrat';

          if (fontFamily.includes(defaultFontFamily)) {
            updateToolbarState('fontFamily', defaultFontFamily);
          } else {
            updateToolbarState('fontFamily', $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
          }
        }

        if (fontColors.size > 1) {
          updateToolbarState('fontColor', '');
        } else {
          updateToolbarState(
            'fontColor',
            $getSelectionStyleValueForProperty(selection, 'color', currentForegroundColor)
          );
        }

        if (backgroundColors.size > 1) {
          updateToolbarState('backgroundColor', '');
        } else {
          updateToolbarState(
            'backgroundColor',
            $getSelectionStyleValueForProperty(selection, 'background-color', currentBackgroundColor)
          );
        }
      } else {
        const fontSizeNumeric = fontSize.replace('px', '');
        updateToolbarState('fontSize', fontSizeNumeric);

        const defaultFontFamily = $isHeadingNode(selectedNode.getTopLevelElement()) ? 'Ubuntu' : 'Montserrat';

        if (fontFamily.includes(defaultFontFamily)) {
          updateToolbarState('fontFamily', defaultFontFamily);
        } else {
          updateToolbarState('fontFamily', fontFamily.split(',')[0].replace(/['"]/g, ''));
        }

        updateToolbarState('fontColor', window.getComputedStyle(selectedElement).color);
        updateToolbarState('backgroundColor', window.getComputedStyle(selectedElement).backgroundColor);
      }
    }

    if ($isRangeSelection(selection)) {
      const nodes = selection.getNodes();
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(node);
      updateToolbarState('isLink', isLink);

      if (isLink) {
        const linkNode = $isLinkNode(parent) ? parent : node;

        if ($isLinkNode(linkNode)) {
          updateToolbarState('linkUrl', linkNode.getURL());
        }
      } else {
        updateToolbarState('linkUrl', '');
      }

      const elementFormats = new Set<string>();
      const blockTypes = new Set<string>();

      nodes.forEach((node) => {
        const topLevelElement = $findTopLevelElement(node);

        if ($isElementNode(topLevelElement)) {
          elementFormats.add(normalizeFormatType(topLevelElement.getFormatType()));
        }

        if ($isListNode(topLevelElement)) {
          blockTypes.add(topLevelElement.getListType());
        } else if ($isHeadingNode(topLevelElement)) {
          blockTypes.add(topLevelElement.getTag());
        } else {
          blockTypes.add(topLevelElement.getType());
        }
      });

      if (elementFormats.size > 1) {
        updateToolbarState('elementFormat', '');
      } else if (elementFormats.size === 1) {
        updateToolbarState(
          'elementFormat',
          Array.from(elementFormats)[0] as 'left' | 'center' | 'right' | 'justify' | ''
        );
      }

      if (blockTypes.size > 1) {
        updateToolbarState('blockType', 'paragraph');
      } else if (blockTypes.size === 1) {
        const blockType = Array.from(blockTypes)[0];

        if (blockType in blockTypeToBlockName) {
          updateToolbarState('blockType', blockType as keyof typeof blockTypeToBlockName);
        }
      }
    }

    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      const tableCellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());

      updateToolbarState('isTableCell', tableCellNode !== null);
      updateToolbarState('tableCellBackgroundColor', tableCellNode?.getBackgroundColor() || currentBackgroundColor);
    } else {
      updateToolbarState('isTableCell', false);
    }

    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      updateToolbarState('isBold', selection.hasFormat('bold'));
      updateToolbarState('isItalic', selection.hasFormat('italic'));
      updateToolbarState('isUnderline', selection.hasFormat('underline'));
      updateToolbarState('isCode', selection.hasFormat('code'));
      updateToolbarState('isStrikethrough', selection.hasFormat('strikethrough'));
      updateToolbarState('isSubscript', selection.hasFormat('subscript'));
      updateToolbarState('isSuperscript', selection.hasFormat('superscript'));
      updateToolbarState('isHighlight', selection.hasFormat('highlight'));
      updateToolbarState('isLowercase', selection.hasFormat('lowercase'));
      updateToolbarState('isUppercase', selection.hasFormat('uppercase'));
      updateToolbarState('isCapitalize', selection.hasFormat('capitalize'));
    }
  }, [updateToolbarState, editor, currentForegroundColor, currentBackgroundColor]);

  React.useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read($updateToolbar);
      }),
      editor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateToolbarState('canUndo', payload);

          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateToolbarState('canRedo', payload);

          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [$updateToolbar, updateToolbarState, editor]);
}
