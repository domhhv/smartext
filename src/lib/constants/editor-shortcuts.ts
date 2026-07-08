import { IS_APPLE } from '@lexical/utils';

export const CMD = IS_APPLE ? '⌘' : 'Ctrl';
export const CTRL = IS_APPLE ? '⌃' : 'Ctrl';
export const ALT = IS_APPLE ? 'Opt' : 'Alt';
export const SHIFT = 'Shift';

const EDITOR_SHORTCUTS = Object.freeze({
  ADD_COMMENT: [CMD, ALT, 'M'],
  BOLD: [CMD, 'B'],
  BULLET_LIST: [CMD, SHIFT, '8'],
  CAPITALIZE: [CTRL, SHIFT, '3'],
  CENTER_ALIGN: [CMD, SHIFT, 'E'],
  CHECK_LIST: [CMD, SHIFT, '9'],
  CLEAR_EDITOR: [CMD, ALT, 'Backspace'],
  CLEAR_FORMATTING: [CMD, '\\'],
  CODE: [CMD, ALT, 'C'],
  DECREASE_FONT_SIZE: [CMD, SHIFT, ','],
  HEADING1: [CMD, ALT, '1'],
  HEADING2: [CMD, ALT, '2'],
  HEADING3: [CMD, ALT, '3'],
  HEADING4: [CMD, ALT, '4'],
  HEADING5: [CMD, ALT, '5'],
  HEADING6: [CMD, ALT, '6'],
  HIGHLIGHT: [CTRL, SHIFT, 'H'],
  INCREASE_FONT_SIZE: [CMD, SHIFT, '.'],
  INDENT: [CMD, ']'],
  INSERT_CODE_BLOCK: [CMD, SHIFT, 'C'],
  INSERT_LINK: [CMD, 'K'],
  INSERT_TABLE: [CMD, ALT, 'T'],
  ITALIC: [CMD, 'I'],
  JUSTIFY_ALIGN: [CMD, SHIFT, 'J'],
  LEFT_ALIGN: [CMD, SHIFT, 'L'],
  LOWERCASE: [CTRL, SHIFT, '1'],
  NORMAL: [CMD, ALT, '0'],
  NUMBERED_LIST: [CMD, SHIFT, '7'],
  OUTDENT: [CMD, '['],
  QUOTE: [CTRL, SHIFT, 'Q'],
  REDO: IS_APPLE ? [CMD, SHIFT, 'Z'] : [CMD, 'Y'],
  RIGHT_ALIGN: [CMD, SHIFT, 'R'],
  STRIKETHROUGH: [CMD, SHIFT, 'X'],
  SUBSCRIPT: [CMD, ','],
  SUPERSCRIPT: [CMD, '.'],
  UNDERLINE: [CMD, 'U'],
  UNDO: [CMD, 'Z'],
  UPPERCASE: [CTRL, SHIFT, '2'],
});

export default EDITOR_SHORTCUTS;
