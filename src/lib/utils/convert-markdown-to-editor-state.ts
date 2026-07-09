import { buildEditorFromExtensions } from '@lexical/extension';
import { $convertFromMarkdownString } from '@lexical/markdown';

import LEXICAL_EDITOR_EXTENSION from '@/lib/constants/editor-extension';
import ENHANCED_LEXICAL_TRANSFORMERS from '@/lib/constants/enhanced-lexical-transformers';

export default function convertMarkdownToEditorState(markdown: string) {
  const editor = buildEditorFromExtensions(LEXICAL_EDITOR_EXTENSION);

  editor.update(
    () => {
      $convertFromMarkdownString(markdown, ENHANCED_LEXICAL_TRANSFORMERS, undefined, true);
    },
    { discrete: true }
  );

  const serialized = JSON.stringify(editor.getEditorState());

  editor.dispose();

  return serialized;
}
