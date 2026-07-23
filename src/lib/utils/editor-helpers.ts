import { $createCodeNode } from '@lexical/code-core';
import { INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $isDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import type { HeadingTagType } from '@lexical/rich-text';
import { $isQuoteNode, $isHeadingNode, $createQuoteNode, $createHeadingNode } from '@lexical/rich-text';
import { $isAtNodeEnd, $setBlocksType, $patchStyleText } from '@lexical/selection';
import { $isTableSelection } from '@lexical/table';
import { $findMatchingParent, $getNearestBlockElementAncestorOrThrow } from '@lexical/utils';
import type { LexicalNode, LexicalEditor, RangeSelection, ElementFormatType } from 'lexical';
import {
  $getRoot,
  $isTextNode,
  $setSelection,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $createParagraphNode,
} from 'lexical';

export function resetEditorSelection(editor: LexicalEditor) {
  editor.update(() => {
    $setSelection(null);
  });
}

export function updateFontSize(editor: LexicalEditor, newFontSize: string) {
  editor.update(() => {
    if (editor.isEditable()) {
      const selection = $getSelection();

      if (selection !== null) {
        $patchStyleText(selection, {
          'font-size': newFontSize,
        });
      }
    }
  });
}

export function formatParagraph(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    $setBlocksType(selection, () => {
      return $createParagraphNode();
    });
  });
}

export function formatHeading(editor: LexicalEditor, blockType: string, headingSize: HeadingTagType) {
  if (blockType !== headingSize) {
    editor.update(() => {
      const selection = $getSelection();
      $setBlocksType(selection, () => {
        return $createHeadingNode(headingSize);
      });
    });
  }
}

export function formatBulletList(editor: LexicalEditor, blockType: string) {
  if (blockType !== 'bullet') {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  } else {
    formatParagraph(editor);
  }
}

export function formatCheckList(editor: LexicalEditor, blockType: string) {
  if (blockType !== 'check') {
    editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
  } else {
    formatParagraph(editor);
  }
}

export function formatNumberedList(editor: LexicalEditor, blockType: string) {
  if (blockType !== 'number') {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  } else {
    formatParagraph(editor);
  }
}

export function formatQuote(editor: LexicalEditor, blockType: string) {
  if (blockType !== 'quote') {
    editor.update(() => {
      const selection = $getSelection();
      $setBlocksType(selection, () => {
        return $createQuoteNode();
      });
    });
  }
}

export function formatCode(editor: LexicalEditor, blockType: string) {
  if (blockType !== 'code') {
    editor.update(() => {
      let selection = $getSelection();

      if (!selection) {
        return;
      }

      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        $setBlocksType(selection, () => {
          return $createCodeNode();
        });
      } else {
        const textContent = selection.getTextContent();
        const codeNode = $createCodeNode();
        selection.insertNodes([codeNode]);
        selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.insertRawText(textContent);
        }
      }
    });
  }
}

export function clearFormatting(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      const nodes = selection.getNodes();
      const extractedNodes = selection.extract();

      if (anchor.key === focus.key && anchor.offset === focus.offset) {
        return;
      }

      nodes.forEach((node, idx) => {
        if ($isTextNode(node)) {
          let textNode = node;

          if (idx === 0 && anchor.offset !== 0) {
            textNode = textNode.splitText(anchor.offset)[1] || textNode;
          }

          if (idx === nodes.length - 1) {
            textNode = textNode.splitText(focus.offset)[0] || textNode;
          }

          const extractedTextNode = extractedNodes[0];

          if (nodes.length === 1 && $isTextNode(extractedTextNode)) {
            textNode = extractedTextNode;
          }

          if (textNode.__style !== '') {
            textNode.setStyle('');
          }

          if (textNode.__format !== 0) {
            textNode.setFormat(0);
          }

          const nearestBlockElement = $getNearestBlockElementAncestorOrThrow(textNode);

          if (nearestBlockElement.__format !== 0) {
            nearestBlockElement.setFormat('');
          }

          if (nearestBlockElement.__indent !== 0) {
            nearestBlockElement.setIndent(0);
          }

          // eslint-disable-next-line no-useless-assignment
          node = textNode;
        } else if ($isHeadingNode(node) || $isQuoteNode(node)) {
          node.replace($createParagraphNode(), true);
        } else if ($isDecoratorBlockNode(node)) {
          node.setFormat('');
        }
      });
    }
  });
}

export function $findTopLevelElement(node: LexicalNode) {
  let topLevelElement =
    node.getKey() === 'root'
      ? node
      : $findMatchingParent(node, (e) => {
          const parent = e.getParent();

          return parent !== null && $isRootOrShadowRoot(parent);
        });

  if (topLevelElement === null) {
    topLevelElement = node.getTopLevelElementOrThrow();
  }

  return topLevelElement;
}

export function getSelectedNode(selection: RangeSelection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();

  if (anchorNode === focusNode) {
    return anchorNode;
  }

  const isBackward = selection.isBackward();

  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? anchorNode : focusNode;
  }
}

export function normalizeFormatType(format: ElementFormatType) {
  if (format === '' || format === 'start') {
    return 'left';
  }

  if (format === 'end') {
    return 'right';
  }

  return format;
}

export function clearEditor(editor: LexicalEditor) {
  editor.update(() => {
    const root = $getRoot();

    if (!root.isEmpty()) {
      root.clear();
      root.append($createParagraphNode());
    }
  });
}
