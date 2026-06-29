import { HorizontalRuleNode, $createHorizontalRuleNode } from '@lexical/extension';
import type { ElementTransformer, TextMatchTransformer, TextFormatTransformer } from '@lexical/markdown';
import {
  CHECK_LIST,
  $convertToMarkdownString,
  $convertFromMarkdownString,
  TRANSFORMERS as BASE_LEXICAL_TRANSFORMERS,
} from '@lexical/markdown';
import { $isHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  TableNode,
  $isTableNode,
  TableRowNode,
  TableCellNode,
  $isTableRowNode,
  $createTableNode,
  $isTableCellNode,
  $createTableRowNode,
  $createTableCellNode,
  TableCellHeaderStates,
} from '@lexical/table';
import type { TextNode, LexicalNode } from 'lexical';
import { $isTextNode, $createTextNode, $isParagraphNode } from 'lexical';

import { ImageNode, $isImageNode, $createImageNode } from '@/components/editor/nodes/image-node';

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/;

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();

  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

function $createTableCell(textContent: string) {
  textContent = textContent.replace(/\\n/g, '\n');
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  $convertFromMarkdownString(textContent, BASE_LEXICAL_TRANSFORMERS, cell);

  return cell;
}

function mapToTableCells(textContent: string) {
  const match = textContent.match(TABLE_ROW_REG_EXP);

  if (!match || !match[1]) {
    return null;
  }

  return match[1].split('|').map($createTableCell);
}

const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  regExp: TABLE_ROW_REG_EXP,
  type: 'element',
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];

    for (const row of node.getChildren()) {
      const rowOutput = [];

      if (!$isTableRowNode(row)) {
        continue;
      }

      let isHeaderRow = false;

      for (const cell of row.getChildren()) {
        if ($isTableCellNode(cell)) {
          rowOutput.push($convertToMarkdownString(BASE_LEXICAL_TRANSFORMERS, cell).replace(/\n/g, '\\n'));

          if (cell.__headerState === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);

      if (isHeaderRow) {
        output.push(
          `| ${rowOutput
            .map((_) => {
              return '---';
            })
            .join(' | ')} |`
        );
      }
    }

    return output.join('\n');
  },
  replace: (parentNode, _1, match) => {
    if (TABLE_ROW_DIVIDER_REG_EXP.test(match[0])) {
      const table = parentNode.getPreviousSibling();

      if (!table || !$isTableNode(table)) {
        return;
      }

      const rows = table.getChildren();
      const lastRow = rows[rows.length - 1];

      if (!lastRow || !$isTableRowNode(lastRow)) {
        return;
      }

      lastRow.getChildren().forEach((cell) => {
        if (!$isTableCellNode(cell)) {
          return;
        }

        cell.toggleHeaderStyle(TableCellHeaderStates.ROW);
      });

      parentNode.remove();

      return;
    }

    const matchCells = mapToTableCells(match[0]);

    if (matchCells == null) {
      return;
    }

    const rows = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling)) {
        break;
      }

      if (sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const cells = mapToTableCells(firstChild.getTextContent());

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = $createTableNode();

    for (const cells of rows) {
      const tableRow = $createTableRowNode();
      table.append(tableRow);

      for (let i = 0; i < maxCells; i++) {
        tableRow.append(i < cells.length ? cells[i] : $createTableCell(''));
      }
    }

    const previousSibling = parentNode.getPreviousSibling();

    if ($isTableNode(previousSibling) && getTableColumnsSize(previousSibling) === maxCells) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
    } else {
      parentNode.replace(table);
    }

    table.selectEnd();
  },
};

const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  regExp: /^(---|\*\*\*|___)\s?$/,
  type: 'element',
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null;
  },
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
};

const SUPERSCRIPT: TextFormatTransformer = {
  format: ['superscript'],
  tag: '^',
  type: 'text-format',
};

const SUPERSCRIPT_HTML: TextMatchTransformer = {
  dependencies: [],
  importRegExp: /<sup>([^<]+)<\/sup>/,
  regExp: /<sup>([^<]+)<\/sup>/,
  trigger: '>',
  type: 'text-match',
  replace: (node: TextNode, match: RegExpMatchArray) => {
    const textContent = match[1];
    const textNode = $createTextNode(textContent);
    textNode.setFormat('superscript');
    node.replace(textNode);
  },
};

const SUBSCRIPT: TextMatchTransformer = {
  dependencies: [],
  importRegExp: /(?<!~)~([^~\s]+(?:\s+[^~\s]+)*)~(?!~)/,
  regExp: /(?<!~)~([^~\s]+(?:\s+[^~\s]+)*)~(?!~)/,
  trigger: '~',
  type: 'text-match',
  replace: (node: TextNode, match: RegExpMatchArray) => {
    const textContent = match[1];
    const textNode = $createTextNode(textContent);
    textNode.setFormat('subscript');
    node.replace(textNode);
  },
};

const SUBSCRIPT_HTML: TextMatchTransformer = {
  dependencies: [],
  importRegExp: /<sub>([^<]+)<\/sub>/,
  regExp: /<sub>([^<]+)<\/sub>/,
  trigger: '>',
  type: 'text-match',
  replace: (node: TextNode, match: RegExpMatchArray) => {
    const textContent = match[1];
    const textNode = $createTextNode(textContent);
    textNode.setFormat('subscript');
    node.replace(textNode);
  },
};

const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
  trigger: ')',
  type: 'text-match',
  export: (node: LexicalNode) => {
    if (!$isImageNode(node)) {
      return null;
    }

    return `![${node.getAltText()}](${node.getSrc()})`;
  },
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const [, altText, src] = match;
    const imageNode = $createImageNode({
      altText,
      maxWidth: 800,
      src,
    });
    textNode.replace(imageNode);
  },
};

const ENHANCED_LEXICAL_TRANSFORMERS = [
  CHECK_LIST,
  HR,
  TABLE,
  IMAGE,
  SUPERSCRIPT,
  SUBSCRIPT,
  SUBSCRIPT_HTML,
  SUPERSCRIPT_HTML,
  ...BASE_LEXICAL_TRANSFORMERS,
];

export default ENHANCED_LEXICAL_TRANSFORMERS;
