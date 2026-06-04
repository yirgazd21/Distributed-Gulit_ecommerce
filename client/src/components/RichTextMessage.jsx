import React from 'react';

const parseInline = (text, keyPrefix) => {
  const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let segmentIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${segmentIndex}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-current underline-offset-2 hover:opacity-90"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${segmentIndex}`} className="font-black">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      nodes.push(
        <em key={`${keyPrefix}-italic-${segmentIndex}`} className="italic">
          {match[5]}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
    segmentIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const RichTextMessage = ({ text = '', className = '' }) => {
  const lines = String(text || '').split('\n');

  return (
    <div className={className}>
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={`spacer-${index}`} className="h-2" />;
        const normalizedLine = line.replace(/^[-*]\s+/, '• ');
        return (
          <p key={`line-${index}`} className="leading-6">
            {parseInline(normalizedLine, `line-${index}`)}
          </p>
        );
      })}
    </div>
  );
};

export default RichTextMessage;
