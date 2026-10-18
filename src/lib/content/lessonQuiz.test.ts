import { describe, expect, it } from 'vitest';
import { lessonQuizId, lessonQuizzes } from './lessonQuiz';

describe('レッスンの確認問題の id', () => {
  it('同じ問題文なら同じ id、違えば別の id', () => {
    expect(lessonQuizId('売掛金とは？')).toBe(lessonQuizId('売掛金とは？'));
    expect(lessonQuizId('売掛金とは？')).not.toBe(lessonQuizId('買掛金とは？'));
  });
  it('本文から取り出す', () => {
    const q = { type: 'choice', question: 'A？', choices: ['x', 'y'], answer: 1, explanation: 'e' };
    const body = `本文\n\n\`\`\`quiz\n${JSON.stringify(q)}\n\`\`\`\n\nつづき`;
    const xs = lessonQuizzes(body);
    expect(xs).toHaveLength(1);
    expect(xs[0].id).toBe(lessonQuizId('A？'));
  });
});
