import { calculateZoomLevel } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';
import * as React from 'react';

const Direction = {
  east: 1 << 0,
  north: 1 << 3,
  south: 1 << 1,
  west: 1 << 2,
};

const RESIZER_HANDLES = [
  {
    className: 'top-[-6px] left-1/2 -translate-x-1/2 cursor-n-resize',
    direction: Direction.north,
  },
  {
    className: 'top-[-6px] right-[-6px] cursor-ne-resize',
    direction: Direction.north | Direction.east,
  },
  {
    className: 'top-1/2 right-[-6px] -translate-y-1/2 cursor-e-resize',
    direction: Direction.east,
  },
  {
    className: 'right-[-6px] bottom-[-6px] cursor-se-resize',
    direction: Direction.south | Direction.east,
  },
  {
    className: 'bottom-[-6px] left-1/2 -translate-x-1/2 cursor-s-resize',
    direction: Direction.south,
  },
  {
    className: 'bottom-[-6px] left-[-6px] cursor-sw-resize',
    direction: Direction.south | Direction.west,
  },
  {
    className: 'top-1/2 left-[-6px] -translate-y-1/2 cursor-w-resize',
    direction: Direction.west,
  },
  {
    className: 'top-[-6px] left-[-6px] cursor-nw-resize',
    direction: Direction.north | Direction.west,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type ImageResizerProps = {
  editor: LexicalEditor;
  imageRef: { current: HTMLImageElement | null };
  onResizeEnd: (width: 'inherit' | number, height: 'inherit' | number) => void;
  onResizeStart: () => void;
};

export default function ImageResizer({ editor, imageRef, onResizeEnd, onResizeStart }: ImageResizerProps) {
  const userSelect = React.useRef({ priority: '', value: 'default' });

  const positioningRef = React.useRef({
    currentHeight: 0 as 'inherit' | number,
    currentWidth: 0 as 'inherit' | number,
    direction: 0,
    isResizing: false,
    ratio: 0,
    startHeight: 0,
    startWidth: 0,
    startX: 0,
    startY: 0,
  });

  const editorRootElement = editor.getRootElement();

  const maxWidthContainer = React.useMemo(() => {
    if (editorRootElement === null) {
      return 100;
    }

    const { paddingLeft, paddingRight } = getComputedStyle(editorRootElement);

    return editorRootElement.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
  }, [editorRootElement]);

  const maxHeightContainer = editorRootElement !== null ? editorRootElement.getBoundingClientRect().height - 20 : 100;

  const minWidth = 100;
  const minHeight = 100;

  function setStartCursor(direction: number) {
    const ew = direction === Direction.east || direction === Direction.west;
    const ns = direction === Direction.north || direction === Direction.south;

    const nwse =
      (direction & Direction.north && direction & Direction.west) ||
      (direction & Direction.south && direction & Direction.east);

    const cursorDir = ew ? 'ew' : ns ? 'ns' : nwse ? 'nwse' : 'nesw';

    if (editorRootElement !== null) {
      editorRootElement.style.setProperty('cursor', `${cursorDir}-resize`, 'important');
    }

    document.body.style.setProperty('cursor', `${cursorDir}-resize`, 'important');
    userSelect.current.value = document.body.style.getPropertyValue('-webkit-user-select');
    userSelect.current.priority = document.body.style.getPropertyPriority('-webkit-user-select');
    document.body.style.setProperty('-webkit-user-select', 'none', 'important');
  }

  function setEndCursor() {
    if (editorRootElement !== null) {
      editorRootElement.style.setProperty('cursor', 'text');
    }

    document.body.style.setProperty('cursor', 'default');
    document.body.style.setProperty('-webkit-user-select', userSelect.current.value, userSelect.current.priority);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, direction: number) {
    if (!editor.isEditable()) {
      return;
    }

    const image = imageRef.current;

    if (image !== null) {
      event.preventDefault();
      const { height, width } = image.getBoundingClientRect();
      const zoom = calculateZoomLevel(image);
      const positioning = positioningRef.current;
      positioning.startWidth = width;
      positioning.startHeight = height;
      positioning.ratio = width / height;
      positioning.currentWidth = width;
      positioning.currentHeight = height;
      positioning.startX = event.clientX / zoom;
      positioning.startY = event.clientY / zoom;
      positioning.isResizing = true;
      positioning.direction = direction;

      setStartCursor(direction);
      onResizeStart();

      image.style.maxWidth = 'none';
      image.style.height = `${height}px`;
      image.style.width = `${width}px`;

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    const image = imageRef.current;
    const positioning = positioningRef.current;

    const isHorizontal = positioning.direction & (Direction.east | Direction.west);
    const isVertical = positioning.direction & (Direction.south | Direction.north);

    if (image !== null && positioning.isResizing) {
      const zoom = calculateZoomLevel(image);

      if (isHorizontal && isVertical) {
        let diff = Math.floor(positioning.startX - event.clientX / zoom);
        diff = positioning.direction & Direction.east ? -diff : diff;

        const width = clamp(positioning.startWidth + diff, minWidth, maxWidthContainer);

        const height = width / positioning.ratio;
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        positioning.currentHeight = height;
        positioning.currentWidth = width;
      } else if (isVertical) {
        let diff = Math.floor(positioning.startY - event.clientY / zoom);
        diff = positioning.direction & Direction.south ? -diff : diff;

        const height = clamp(positioning.startHeight + diff, minHeight, maxHeightContainer);

        image.style.height = `${height}px`;
        positioning.currentHeight = height;
      } else {
        let diff = Math.floor(positioning.startX - event.clientX / zoom);
        diff = positioning.direction & Direction.east ? -diff : diff;

        const width = clamp(positioning.startWidth + diff, minWidth, maxWidthContainer);

        image.style.width = `${width}px`;
        positioning.currentWidth = width;
      }
    }
  }

  function handlePointerUp() {
    const image = imageRef.current;
    const positioning = positioningRef.current;

    if (image !== null && positioning.isResizing) {
      const width = positioning.currentWidth;
      const height = positioning.currentHeight;
      positioning.startWidth = 0;
      positioning.startHeight = 0;
      positioning.ratio = 0;
      positioning.startX = 0;
      positioning.startY = 0;
      positioning.currentWidth = 0;
      positioning.currentHeight = 0;
      positioning.isResizing = false;

      image.style.maxWidth = '';

      setEndCursor();
      onResizeEnd(width, height);

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }
  }

  return (
    <>
      {RESIZER_HANDLES.map(({ className, direction }) => {
        return (
          <div
            key={direction}
            className={`bg-primary border-background absolute size-2 touch-none border ${className}`}
            onPointerDown={(event) => {
              handlePointerDown(event, direction);
            }}
          />
        );
      })}
    </>
  );
}
