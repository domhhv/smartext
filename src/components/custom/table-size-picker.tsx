import * as React from 'react';

import cn from '@/lib/utils/cn';

type TableSizePickerProps = {
  maxColumns?: number;
  maxRows?: number;
  onSelect: (rows: number, columns: number) => void;
};

export default function TableSizePicker({ maxColumns = 10, maxRows = 8, onSelect }: TableSizePickerProps) {
  const [hovered, setHovered] = React.useState<{ columns: number; rows: number } | null>(null);

  return (
    <div className="space-y-2">
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
