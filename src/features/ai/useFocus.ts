import { useEffect } from 'react';
import { useAiFocus, type AiFocus } from './focusStore';

/**
 * このページで見ているものを AI に伝える（ページを開いている間）。
 * focus は JSON にして比べるので、中身が同じなら作り直しても更新しない。
 */
export function useFocus(focus: AiFocus | null): void {
  const key = focus ? JSON.stringify(focus) : null;
  useEffect(() => {
    if (key) useAiFocus.getState().set(JSON.parse(key) as AiFocus);
  }, [key]);
}
