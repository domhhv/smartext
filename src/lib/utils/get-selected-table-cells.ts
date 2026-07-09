import { $getNodeTriplet, $isTableCellNode, $isTableSelection, type TableCellNode } from '@lexical/table';
import { $isRangeSelection, type BaseSelection } from 'lexical';

export default function $getSelectedTableCells(selection: BaseSelection | null) {
  const cells = new Set<TableCellNode>();

  if ($isRangeSelection(selection) || $isTableSelection(selection)) {
    const [anchorCell] = $getNodeTriplet(selection.anchor);

    if ($isTableCellNode(anchorCell)) {
      cells.add(anchorCell);
    }

    if ($isTableSelection(selection)) {
      selection.getNodes().forEach((node) => {
        if ($isTableCellNode(node)) {
          cells.add(node);
        }
      });
    }
  }

  return [...cells];
}
