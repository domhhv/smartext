'use client';

import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import * as React from 'react';

import LEXICAL_EDITOR_EXTENSION from '@/lib/constants/editor-extension';

export default function LexicalExtensionComposerProvider({ children }: { children: React.ReactNode }) {
  return (
    <LexicalExtensionComposer contentEditable={null} extension={LEXICAL_EDITOR_EXTENSION}>
      {children}
    </LexicalExtensionComposer>
  );
}
