'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'smartext-dev-banner-dismissed';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);

  return () => {
    return window.removeEventListener('storage', callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot() {
  return true;
}

export default function DevelopmentBanner() {
  const isDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    window.dispatchEvent(new Event('storage'));
  }, []);

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-accent text-foreground z-20 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-center text-sm font-medium">
      <span>
        🚧&nbsp;&nbsp;&nbsp;This app is in early development. Some unexpected bugs might occur. New features are coming
        soon!
      </span>
      <Button size="sm" onClick={handleDismiss}>
        Ok, got it
      </Button>
    </div>
  );
}
