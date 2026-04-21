import Link from "next/link"
import type { MDXComponents } from "mdx/types"
import { RoomCTA } from "./room-cta"

export const mdxComponents: MDXComponents = {
  h1: ({ children, ...props }) => (
    <h1
      className="mt-12 mb-4 text-3xl font-bold tracking-tight"
      style={{ color: "#e8e6ea" }}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mt-12 mb-4 text-2xl font-bold tracking-tight"
      style={{ color: "#e8e6ea" }}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mt-8 mb-3 text-lg font-semibold"
      style={{ color: "#e8e6ea" }}
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p
      className="my-5 leading-7"
      style={{ color: "rgba(232,230,234,0.82)" }}
      {...props}
    >
      {children}
    </p>
  ),
  a: ({ href, children, ...props }) => {
    const isInternal = typeof href === "string" && href.startsWith("/")
    const className = "underline underline-offset-4 transition-colors"
    const style = { color: "#e89a3c" }
    if (isInternal) {
      return (
        <Link href={href} className={className} style={style}>
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        className={className}
        style={style}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  ul: ({ children, ...props }) => (
    <ul
      className="my-5 list-disc space-y-2 pl-6"
      style={{ color: "rgba(232,230,234,0.82)" }}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="my-5 list-decimal space-y-2 pl-6"
      style={{ color: "rgba(232,230,234,0.82)" }}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-7" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" style={{ color: "#e8e6ea" }} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-6 border-l-2 pl-4 italic"
      style={{
        borderColor: "#e89a3c",
        color: "rgba(232,230,234,0.7)",
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, ...props }) => (
    <code
      className="rounded px-1.5 py-0.5 font-mono text-[0.9em]"
      style={{
        background: "rgba(255,255,255,0.06)",
        color: "#e8e6ea",
      }}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl p-4 font-mono text-[13px] leading-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        color: "#e8e6ea",
      }}
      {...props}
    >
      {children}
    </pre>
  ),
  hr: (props) => (
    <hr
      className="my-10 border-0 border-t"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
      {...props}
    />
  ),
  table: ({ children, ...props }) => (
    <div className="my-8 overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ color: "rgba(232,230,234,0.82)" }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead
      style={{
        borderBottom: "0.5px solid rgba(255,255,255,0.12)",
        color: "#e8e6ea",
      }}
      {...props}
    >
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-3 py-2 font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="px-3 py-2 align-top"
      style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}
      {...props}
    >
      {children}
    </td>
  ),
  RoomCTA,
}
