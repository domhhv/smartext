import { createCommand } from 'lexical';

import type { ImagePayload } from '@/components/editor/nodes/image-node';

const INSERT_IMAGE_COMMAND = createCommand<ImagePayload>('INSERT_IMAGE_COMMAND');

export default INSERT_IMAGE_COMMAND;
