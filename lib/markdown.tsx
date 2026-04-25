import type { ReactNode } from "react"
import { Fragment } from "react"

// Tiny markdown subset: # H1-H3, **bold**, *italic*, `code`, [link](url),
// - lists, 1. ordered lists, > blockquote, ``` code blocks. Newlines = paragraphs.
// Designed for short notes, not full docs.

interface InlineSegment {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  link?: string
}

function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = []
  let i = 0
  while (i < text.length) {
    // code
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1)
      if (end !== -1) {
        out.push({ text: text.slice(i + 1, end), code: true })
        i = end + 1
        continue
      }
    }
    // bold
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2)
      if (end !== -1) {
        out.push({ text: text.slice(i + 2, end), bold: true })
        i = end + 2
        continue
      }
    }
    // italic
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1)
      if (end !== -1) {
        out.push({ text: text.slice(i + 1, end), italic: true })
        i = end + 1
        continue
      }
    }
    // link [label](url)
    if (text[i] === "[") {
      const close = text.indexOf("]", i + 1)
      if (close !== -1 && text[close + 1] === "(") {
        const urlEnd = text.indexOf(")", close + 2)
        if (urlEnd !== -1) {
          out.push({
            text: text.slice(i + 1, close),
            link: text.slice(close + 2, urlEnd),
          })
          i = urlEnd + 1
          continue
        }
      }
    }
    // plain
    let j = i
    while (
      j < text.length &&
      text[j] !== "`" &&
      text[j] !== "*" &&
      text[j] !== "["
    ) {
      j++
    }
    if (j > i) {
      out.push({ text: text.slice(i, j) })
    } else {
      out.push({ text: text[i] })
      j = i + 1
    }
    i = j
  }
  return out
}

function renderInline(text: string, keyPrefix = ""): ReactNode[] {
  const segs = parseInline(text)
  return segs.map((s, idx) => {
    const k = `${keyPrefix}-${idx}`
    if (s.code) return <code key={k} className="px-1 py-0.5 rounded bg-white/[0.08] text-[12px] font-mono text-white/80">{s.text}</code>
    if (s.link)
      return (
        <a
          key={k}
          href={s.link}
          target="_blank"
          rel="noreferrer"
          className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
        >
          {s.text}
        </a>
      )
    if (s.bold) return <strong key={k} className="font-semibold text-white">{s.text}</strong>
    if (s.italic) return <em key={k} className="italic">{s.text}</em>
    return <Fragment key={k}>{s.text}</Fragment>
  })
}

export function renderMarkdown(src: string): ReactNode[] {
  if (!src) return []
  const lines = src.replace(/\r\n/g, "\n").split("\n")
  const out: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    // code block
    if (line.startsWith("```")) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i])
        i++
      }
      i++
      out.push(
        <pre
          key={key++}
          className="my-2 p-3 rounded-lg bg-black/40 border border-white/[0.06] text-[12px] font-mono text-white/80 overflow-x-auto whitespace-pre"
        >
          {buf.join("\n")}
        </pre>,
      )
      continue
    }
    // headers
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const content = h[2]
      const Cls =
        level === 1
          ? "text-[16px] font-semibold text-white mt-3 mb-1.5"
          : level === 2
            ? "text-[14px] font-semibold text-white mt-2.5 mb-1"
            : "text-[13px] font-semibold text-white/90 mt-2 mb-1"
      out.push(
        <div key={key++} className={Cls}>
          {renderInline(content, `h-${key}`)}
        </div>,
      )
      i++
      continue
    }
    // unordered list
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""))
        i++
      }
      out.push(
        <ul key={key++} className="my-1 ml-5 list-disc space-y-0.5">
          {items.map((it, k) => (
            <li key={k} className="text-[13px] text-white/70">
              {renderInline(it, `li-${k}`)}
            </li>
          ))}
        </ul>,
      )
      continue
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""))
        i++
      }
      out.push(
        <ol key={key++} className="my-1 ml-5 list-decimal space-y-0.5">
          {items.map((it, k) => (
            <li key={k} className="text-[13px] text-white/70">
              {renderInline(it, `oli-${k}`)}
            </li>
          ))}
        </ol>,
      )
      continue
    }
    // blockquote
    if (line.startsWith("> ")) {
      const buf: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2))
        i++
      }
      out.push(
        <blockquote
          key={key++}
          className="my-2 pl-3 border-l-2 border-white/20 text-[13px] text-white/60 italic"
        >
          {buf.map((b, k) => (
            <div key={k}>{renderInline(b, `bq-${k}`)}</div>
          ))}
        </blockquote>,
      )
      continue
    }
    // empty line
    if (line.trim() === "") {
      i++
      continue
    }
    // paragraph
    const buf: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("#") &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("> ")
    ) {
      buf.push(lines[i])
      i++
    }
    out.push(
      <p key={key++} className="my-1.5 text-[13px] text-white/70 leading-relaxed">
        {renderInline(buf.join(" "), `p-${key}`)}
      </p>,
    )
  }
  return out
}
