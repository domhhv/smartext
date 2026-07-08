import { IS_APPLE } from '@lexical/utils';
import { isModifierMatch } from 'lexical';

const CONTROL_OR_META = { ctrlKey: !IS_APPLE, metaKey: IS_APPLE };

export function isFormatParagraph(event: KeyboardEvent) {
  const { code } = event;

  return (code === 'Numpad0' || code === 'Digit0') && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true });
}

export function isFormatHeading(event: KeyboardEvent) {
  const { code } = event;

  if (!code) {
    return false;
  }

  const keyNumber = code[code.length - 1];

  return (
    ['1', '2', '3', '4', '5', '6'].includes(keyNumber) && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true })
  );
}

export function isFormatNumberedList(event: KeyboardEvent) {
  const { code } = event;

  return (code === 'Numpad7' || code === 'Digit7') && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isFormatBulletList(event: KeyboardEvent) {
  const { code } = event;

  return (code === 'Numpad8' || code === 'Digit8') && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isFormatCheckList(event: KeyboardEvent) {
  const { code } = event;

  return (code === 'Numpad9' || code === 'Digit9') && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isFormatCode(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyC' && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true });
}

export function isFormatQuote(event: KeyboardEvent) {
  const { code } = event;

  return (
    code === 'KeyQ' &&
    isModifierMatch(event, {
      ctrlKey: true,
      shiftKey: true,
    })
  );
}

export function isLowercase(event: KeyboardEvent) {
  const { code } = event;

  return (code === 'Numpad1' || code === 'Digit1') && isModifierMatch(event, { ctrlKey: true, shiftKey: true });
}

export function isUppercase(event: KeyboardEvent) {
  const { code } = event;

  return (code === 'Numpad2' || code === 'Digit2') && isModifierMatch(event, { ctrlKey: true, shiftKey: true });
}

export function isCapitalize(event: KeyboardEvent) {
  const { code } = event;

  return (code === 'Numpad3' || code === 'Digit3') && isModifierMatch(event, { ctrlKey: true, shiftKey: true });
}

export function isStrikeThrough(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyX' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isHighlight(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyH' && isModifierMatch(event, { ctrlKey: true, shiftKey: true });
}

export function isIndent(event: KeyboardEvent) {
  const { code } = event;

  return code === 'BracketRight' && isModifierMatch(event, CONTROL_OR_META);
}

export function isOutdent(event: KeyboardEvent) {
  const { code } = event;

  return code === 'BracketLeft' && isModifierMatch(event, CONTROL_OR_META);
}

export function isCenterAlign(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyE' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isLeftAlign(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyL' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isRightAlign(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyR' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isJustifyAlign(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyJ' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isSubscript(event: KeyboardEvent) {
  const { code } = event;

  return code === 'Comma' && isModifierMatch(event, CONTROL_OR_META);
}

export function isSuperscript(event: KeyboardEvent) {
  const { code } = event;

  return code === 'Period' && isModifierMatch(event, CONTROL_OR_META);
}

export function isInsertCodeBlock(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyC' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isIncreaseFontSize(event: KeyboardEvent) {
  const { code } = event;

  return code === 'Period' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isDecreaseFontSize(event: KeyboardEvent) {
  const { code } = event;

  return code === 'Comma' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isClearFormatting(event: KeyboardEvent) {
  const { code } = event;

  return code === 'Slash' && isModifierMatch(event, CONTROL_OR_META);
}

export function isClearEditor(event: KeyboardEvent) {
  const { code } = event;

  return code === 'Backspace' && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true });
}

export function isInsertLink(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyK' && isModifierMatch(event, CONTROL_OR_META);
}

export function isInsertTable(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyT' && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true });
}

export function isAddComment(event: KeyboardEvent) {
  const { code } = event;

  return code === 'KeyM' && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true });
}
