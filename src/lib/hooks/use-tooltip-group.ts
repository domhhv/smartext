import * as React from 'react';

type UseTooltipGroupReturn = {
  getTooltipProps: () => {
    delayDuration: number;
    onMouseEnter: () => void;
  };
  onGroupMouseLeave: () => void;
};

export default function useTooltipGroup(normalDelay = 500, skipDelayWindow = 300): UseTooltipGroupReturn {
  const [isInSkipDelayWindow, setIsInSkipDelayWindow] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleItemMouseEnter = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isInSkipDelayWindow) {
      setIsInSkipDelayWindow(true);
    }
  }, [isInSkipDelayWindow]);

  const handleGroupMouseLeave = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsInSkipDelayWindow(false);
    }, skipDelayWindow);
  }, [skipDelayWindow]);

  const getTooltipProps = React.useCallback(() => {
    return {
      delayDuration: isInSkipDelayWindow ? 0 : normalDelay,
      onMouseEnter: handleItemMouseEnter,
    };
  }, [isInSkipDelayWindow, normalDelay, handleItemMouseEnter]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    getTooltipProps,
    onGroupMouseLeave: handleGroupMouseLeave,
  };
}
