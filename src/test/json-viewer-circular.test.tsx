import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { JsonViewer } from "@/components/common/JsonViewer"

describe("JsonViewer circular references", () => {
  it("renders a self-referencing object as [Circular] instead of overflowing the stack", () => {
    const data: Record<string, unknown> = { name: "root" }
    data.self = data

    const html = renderToStaticMarkup(<JsonViewer data={data} />)

    expect(html).toContain("[Circular]")
    expect(html).toContain("name")
  })

  it("renders a self-referencing array as [Circular] instead of overflowing the stack", () => {
    const data: unknown[] = [1, 2]
    data.push(data)

    const html = renderToStaticMarkup(<JsonViewer data={data} />)

    expect(html).toContain("[Circular]")
  })

  it("renders mutually-referencing objects without crashing", () => {
    const a: Record<string, unknown> = { label: "a" }
    const b: Record<string, unknown> = { label: "b" }
    a.peer = b
    b.peer = a

    const html = renderToStaticMarkup(<JsonViewer data={a} />)

    expect(html).toContain("[Circular]")
  })

  it("does not flag a shared (non-circular) reference as circular", () => {
    const shared = { value: 42 }
    const data = { a: shared, b: shared }

    const html = renderToStaticMarkup(<JsonViewer data={data} />)

    expect(html).not.toContain("[Circular]")
    expect(html.match(/42/g)).toHaveLength(2)
  })
})
