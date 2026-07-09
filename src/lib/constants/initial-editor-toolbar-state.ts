export const MIN_ALLOWED_FONT_SIZE = 8;
export const MAX_ALLOWED_FONT_SIZE = 72;
export const DEFAULT_FONT_SIZE = 15;

export const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

const INITIAL_TOOLBAR_STATE = {
  backgroundColor: '',
  blockType: 'paragraph' as keyof typeof blockTypeToBlockName,
  canRedo: false,
  canUndo: false,
  elementFormat: 'left' as 'left' | 'center' | 'right' | 'justify' | '',
  fontColor: '',
  fontFamily: 'Arial',
  fontSize: `${DEFAULT_FONT_SIZE}`,
  isBold: false,
  isBulletList: false,
  isCapitalize: false,
  isCode: false,
  isCodeBlock: false,
  isHighlight: false,
  isItalic: false,
  isLink: false,
  isLowercase: false,
  isNumberedList: false,
  isQuote: false,
  isStrikethrough: false,
  isSubscript: false,
  isSuperscript: false,
  isTableCell: false,
  isUnderline: false,
  isUppercase: false,
  linkUrl: '',
  tableCellBackgroundColor: '',
};

export default INITIAL_TOOLBAR_STATE;
