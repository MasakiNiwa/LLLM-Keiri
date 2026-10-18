import { createContext, useContext } from 'react';

/** いま表示しているレッスンの id（確認問題の記録・復習に使う） */
export const LessonIdContext = createContext<string | null>(null);

export const useLessonId = () => useContext(LessonIdContext);
