import { CodeNode } from '@lexical/code-core';
import { HorizontalRuleNode, HorizontalRuleExtension } from '@lexical/extension';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import { QuoteNode, HeadingNode } from '@lexical/rich-text';
import { TableNode, TableExtension } from '@lexical/table';
import { $isRootNode, LineBreakNode, defineExtension, $createParagraphNode } from 'lexical';
import { toast } from 'sonner';

import { ImageNode } from '@/components/editor/nodes/image-node';
import getErrorMessage from '@/lib/utils/get-error-message';

const LEXICAL_EDITOR_EXTENSION = defineExtension({
  dependencies: [HorizontalRuleExtension, TableExtension],
  name: 'MyEditor',
  namespace: 'MyEditor',
  nodes() {
    return [
      HeadingNode,
      ListNode,
      ListItemNode,
      CodeNode,
      QuoteNode,
      AutoLinkNode,
      LinkNode,
      HorizontalRuleNode,
      LineBreakNode,
      ImageNode,
    ];
  },
  onError: (error) => {
    toast('An error occurred in the editor', {
      description: getErrorMessage(error),
    });
  },
  register: (editor) => {
    return editor.registerNodeTransform(TableNode, (tableNode) => {
      if (!$isRootNode(tableNode.getParent())) {
        return;
      }

      if (tableNode.getPreviousSibling() === null) {
        tableNode.insertBefore($createParagraphNode());
      }

      if (tableNode.getNextSibling() === null) {
        tableNode.insertAfter($createParagraphNode());
      }
    });
  },
  theme: {
    hr: 'border-t border-slate-200 my-4',
    image: 'relative my-4 inline-block max-w-full select-none',
    link: 'text-sky-500 underline hover:text-blue-600',
    paragraph: 'my-1 text-base leading-5',
    quote: 'italic text-slate-500 border-l-4 border-slate-500 pl-2',
    table: 'editor-table my-4 w-fit table-fixed border-collapse border-spacing-0 border border-border',
    tableCell: 'relative w-[75px] border border-border px-2 py-1.5 align-top',
    tableCellHeader: 'bg-muted text-start font-semibold',
    tableCellSelected: 'editor-table-cell-selected',
    tableScrollableWrapper: 'editor-table-scrollable-wrapper my-4 overflow-x-auto [&>table]:my-0',
    tableSelected: 'editor-table-selected',
    tableSelection: 'editor-table-selection',
    heading: {
      h1: 'text-5xl font-(family-name:--font-ubuntu)',
      h2: 'text-4xl font-(family-name:--font-ubuntu)',
      h3: 'text-3xl font-(family-name:--font-ubuntu)',
      h4: 'text-2xl font-(family-name:--font-ubuntu)',
      h5: 'text-xl font-(family-name:--font-ubuntu)',
      h6: 'text-lg font-(family-name:--font-ubuntu)',
    },
    list: {
      listitem: 'mx-8',
      listitemChecked: 'editor-list-item-checked',
      listitemUnchecked: 'editor-list-item-unchecked',
      ol: 'list-decimal ml-4',
      ul: 'p-0 m-0 ml-4 list-disc',
      nested: {
        listitem: 'list-none',
      },
      olDepth: [
        'p-0 m-0 list-outside',
        'p-0 m-0 list-outside list-[upper-alpha]!',
        'p-0 m-0 list-outside list-[lower-alpha]!',
        'p-0 m-0 list-outside list-[upper-roman]!',
        'p-0 m-0 list-outside list-[lower-roman]!',
      ],
      ulDepth: [
        'p-0 m-0 list-outside',
        'p-0 m-0 list-outside list-[circle]!',
        'p-0 m-0 list-outside list-[square]!',
        'p-0 m-0 list-outside list-[disc]!',
      ],
    },
    tableAlignment: {
      center: 'mx-auto',
      right: 'ml-auto',
    },
    text: {
      bold: 'font-bold',
      capitalize: 'capitalize',
      code: 'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      highlight: 'bg-yellow-300',
      italic: 'italic',
      lowercase: 'lowercase',
      strikethrough: 'line-through',
      subscript: 'text-xs',
      superscript: 'text-xs',
      underline: 'underline',
      underlineStrikethrough: 'line-through underline',
      uppercase: 'uppercase',
    },
  },
});

export default LEXICAL_EDITOR_EXTENSION;
