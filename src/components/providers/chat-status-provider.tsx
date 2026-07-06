'use client';

import type { ChatStatus } from 'ai';
import * as React from 'react';

export const ChatStatusContext = React.createContext<{
  isChatVisible: boolean;
  setIsChatVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setStatus: React.Dispatch<React.SetStateAction<ChatStatus>>;
  status: ChatStatus;
}>({
  isChatVisible: false,
  status: 'ready',
  setIsChatVisible: () => {},
  setStatus: () => {},
});

export default function ChatStatusProvider({
  children,
  defaultIsVisible = true,
}: {
  children: React.ReactNode;
  defaultIsVisible?: boolean;
}) {
  const [status, setStatus] = React.useState<ChatStatus>('ready');
  const [isChatVisible, setIsChatVisible] = React.useState(defaultIsVisible);

  const value = React.useMemo(() => {
    return { isChatVisible, setIsChatVisible, setStatus, status };
  }, [status, isChatVisible]);

  return <ChatStatusContext.Provider value={value}>{children}</ChatStatusContext.Provider>;
}
