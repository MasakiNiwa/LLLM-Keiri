import { FONT_SCALES, useSettings } from './settingsStore';

/** 本文の文字の大きさ（CSS の zoom に渡す倍率） */
export function useFontZoom(): number {
  return FONT_SCALES[useSettings((s) => s.fontScale)].zoom;
}
