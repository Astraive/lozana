import type { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Render markdown source into a sanitized React element tree.
 *
 * `react-markdown` parses the source into real elements (headings, lists,
 * links, code blocks, tables, ...). Raw HTML is not interpreted and
 * `rehype-sanitize` strips unsafe nodes/attributes as defense in depth, so
 * untrusted panel content cannot inject scripts or event handlers.
 */
export function renderMarkdownContent(content: string): ReactElement {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
    >
      {content}
    </ReactMarkdown>
  );
}
