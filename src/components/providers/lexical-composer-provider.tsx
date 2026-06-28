'use client';

import { HorizontalRuleExtension } from '@lexical/extension';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { defineExtension } from 'lexical';
import * as React from 'react';

import INITIAL_EDITOR_CONFIG from '@/lib/constants/initial-editor-config';

export default function LexicalComposerProvider({ children }: { children: React.ReactNode }) {
  const extension = React.useMemo(() => {
    return defineExtension({
      dependencies: [HorizontalRuleExtension],
      name: 'MyEditor',
    });
  }, []);

  return (
    <LexicalExtensionComposer extension={extension}>
      <LexicalComposer initialConfig={INITIAL_EDITOR_CONFIG}>{children}</LexicalComposer>
    </LexicalExtensionComposer>
  );
}
