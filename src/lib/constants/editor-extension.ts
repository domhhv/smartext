import { CodeNode } from '@lexical/code-core';
import { HorizontalRuleNode, HorizontalRuleExtension } from '@lexical/extension';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import { QuoteNode, HeadingNode } from '@lexical/rich-text';
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';
import { LineBreakNode, defineExtension } from 'lexical';
import { toast } from 'sonner';

import { ImageNode } from '@/components/editor/nodes/image-node';
import getErrorMessage from '@/lib/utils/get-error-message';

const LEXICAL_EDITOR_EXTENSION = defineExtension({
  dependencies: [HorizontalRuleExtension],
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
      TableNode,
      TableCellNode,
      HorizontalRuleNode,
      TableRowNode,
      LineBreakNode,
      ImageNode,
    ];
  },
  onError: (error) => {
    toast('An error occurred in the editor', {
      description: getErrorMessage(error),
    });
  },
  theme: {
    hr: 'border-t border-slate-200 my-4',
    image: 'my-4',
    link: 'text-sky-500 underline hover:text-blue-600',
    paragraph: 'my-1 text-base leading-5',
    quote: 'italic text-slate-500 border-l-4 border-slate-500 pl-2',
    table: 'border-collapse border border-slate-300 my-4',
    tableCell: 'border border-slate-300 p-2',
    tableRow: 'border-t border-slate-300',
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
