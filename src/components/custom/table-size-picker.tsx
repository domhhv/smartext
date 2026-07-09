import * as React from 'react';

import cn from '@/lib/utils/cn';

type TableSizePickerProps = {
  maxColumns?: number;
  maxRows?: number;
  onSelect: (rows: number, columns: number) => void;
};

export default function TableSizePicker({ maxColumns = 10, maxRows = 8, onSelect }: TableSizePickerProps) {
  const [hovered, setHovered] = React.useState<{ columns: number; rows: number } | null>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const current = hovered ?? { columns: 1, rows: 1 };

    if (event.key === 'Enter') {
      onSelect(current.rows, current.columns);

      return;
    }

    if (hovered === null) {
      setHovered(current);

      return;
    }

    const next = {
      ArrowDown: { ...current, rows: Math.min(current.rows + 1, maxRows) },
      ArrowLeft: { ...current, columns: Math.max(current.columns - 1, 1) },
      ArrowRight: { ...current, columns: Math.min(current.columns + 1, maxColumns) },
      ArrowUp: { ...current, rows: Math.max(current.rows - 1, 1) },
    }[event.key];

    if (next) {
      setHovered(next);
    }
  }

  return (
    <div className="space-y-2" onKeyDown={handleKeyDown}>
      <div
        role="grid"
        className="grid w-fit gap-1"
        onMouseLeave={() => {
          setHovered(null);
        }}
        style={{ gridTemplateColumns: `repeat(${maxColumns}, 1fr)` }}
      >
        {Array.from({ length: maxRows * maxColumns }, (_, index) => {
          const row = Math.floor(index / maxColumns) + 1;
          const column = (index % maxColumns) + 1;
          const isActive = hovered !== null && row <= hovered.rows && column <= hovered.columns;

          return (
            <button
              key={index}
              type="button"
              aria-label={`Insert ${column} × ${row} table`}
              onClick={() => {
                onSelect(row, column);
              }}
              onMouseEnter={() => {
                setHovered({ columns: column, rows: row });
              }}
              className={cn(
                'border-border size-4 rounded-xs border transition-colors',
                isActive && 'border-primary bg-primary/20'
              )}
            />
          );
        })}
      </div>
      <p className="text-muted-foreground text-center text-sm">
        {hovered ? `${hovered.columns} × ${hovered.rows}` : 'Insert table'}
      </p>
    </div>
  );
}
