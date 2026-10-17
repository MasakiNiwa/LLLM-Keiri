import { memo } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkGfm from 'remark-gfm';
import { ShiwakeBlock } from '@/features/journal/ShiwakeBlock';
import { Callout } from './Callout';
import { QuizBlock } from './QuizBlock';
import {
  CALLOUT_TYPES,
  remarkCallouts,
  remarkCjkNewlines,
  remarkHeadingIds,
  type CalloutType,
} from './remarkPlugins';

const remarkPlugins: Options['remarkPlugins'] = [
  remarkGfm,
  // 「**「強調」**です」のような日本語の括弧と ** の組み合わせでも太字にする
  remarkCjkFriendly,
  remarkCallouts,
  remarkHeadingIds,
  remarkCjkNewlines,
];

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: string[] };
  children?: HastNode[];
}

function textOf(node: HastNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  // ```shiwake と ```quiz は専用の部品で表示する
  pre: ({ node, children, ...props }) => {
    const code = (node as HastNode | undefined)?.children?.find((c) => c.tagName === 'code');
    const lang = code?.properties?.className?.find((c) => c.startsWith('language-'))?.slice(9);
    if (lang === 'shiwake') return <ShiwakeBlock text={textOf(code).replace(/\n$/, '')} />;
    if (lang === 'quiz') return <QuizBlock json={textOf(code)} />;
    return <pre {...props}>{children}</pre>;
  },
  blockquote: ({ node: _node, children, ...props }) => {
    const type = (props as Record<string, unknown>)['data-callout'] as CalloutType | undefined;
    if (type && (CALLOUT_TYPES as readonly string[]).includes(type))
      return <Callout type={type}>{children}</Callout>;
    return <blockquote {...props}>{children}</blockquote>;
  },
  table: ({ node: _node, ...props }) => (
    <div className="my-4 overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

/** レッスンの本文 */
export const LessonMarkdown = memo(function LessonMarkdown({ body }: { body: string }) {
  return (
    <div className="prose-lesson">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  );
});
