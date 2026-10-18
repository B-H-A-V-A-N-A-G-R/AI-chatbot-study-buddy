import { useMemo, useState } from 'react';
import { CopyIcon } from './Icons.jsx';

// A tiny Markdown renderer, so the model's answers show real headings, lists, **bold** and
// code blocks instead of raw symbols. It builds normal React elements (never raw HTML), so
// text coming from the model cannot inject markup or scripts.
//
// Supported: ``` code blocks ```, # headings, - / 1. lists, **bold**, *italic*, `inline code`.
// It also copes with half-finished text, which matters because answers arrive piece by piece.

// ---- inline pieces: `code`, **bold**, *italic* -------------------------------------------
function renderInline(text) {
  const out = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('`')) out.push(<code key={key++}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    else out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ---- block level: split the text into code blocks, headings, lists and paragraphs ---------
const LIST_ITEM = /^\s*([-*]|\d+[.)])\s+/;
const HEADING = /^(#{1,4})\s+(.*)$/;
const FENCE_OPEN = /^\s*```(\w[\w+-]*)?\s*$/;
const FENCE_ANY = /^\s*```/;

function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(FENCE_OPEN);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++; // skip the closing fence (or run off the end while the answer is still streaming)
      blocks.push({ type: 'code', lang: fence[1], code: code.join('\n') });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && LIST_ITEM.test(lines[i])) items.push(lines[i++].replace(LIST_ITEM, ''));
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    // paragraph: keep going until a blank line or the start of another kind of block
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !FENCE_ANY.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !LIST_ITEM.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    if (para.length === 0) para.push(lines[i++]); // safety: never loop forever on odd input
    blocks.push({ type: 'p', text: para.join('\n') });
  }
  return blocks;
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked by the browser: ignore */
    }
  }

  return (
    <div className="codeblock">
      <div className="codehead">
        <span>{lang || 'code'}</span>
        <button type="button" className="copy-btn" onClick={copy}>
          <CopyIcon size={14} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Markdown({ text }) {
  // Re-parse only when the text changes.
  const blocks = useMemo(() => parse(text || ''), [text]);

  return (
    <div className="md">
      {blocks.map((b, k) => {
        if (b.type === 'code') return <CodeBlock key={k} lang={b.lang} code={b.code} />;
        if (b.type === 'heading') {
          const Tag = b.level <= 2 ? 'h3' : 'h4';
          return <Tag key={k}>{renderInline(b.text)}</Tag>;
        }
        if (b.type === 'list') {
          const List = b.ordered ? 'ol' : 'ul';
          return (
            <List key={k}>
              {b.items.map((item, n) => (
                <li key={n}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }
        return <p key={k}>{renderInline(b.text)}</p>;
      })}
    </div>
  );
}
