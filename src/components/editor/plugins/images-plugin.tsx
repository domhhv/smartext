import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapNodeInElement } from '@lexical/utils';
import { $insertNodes, $isRootOrShadowRoot, $createParagraphNode, COMMAND_PRIORITY_EDITOR } from 'lexical';
import * as React from 'react';

import { $createImageNode } from '@/components/editor/nodes/image-node';
import INSERT_IMAGE_COMMAND from '@/lib/constants/editor-insert-image-command';

export default function ImagesPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);

        if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
          $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
