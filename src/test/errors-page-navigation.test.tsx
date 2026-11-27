// @vitest-environment jsdom
import * as React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type * as ReactRouterDOM from "react-router-dom"
import ErrorsPage from "@/pages/errors"

const { navigateMock, useErrorEventsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useErrorEventsMock: vi.fn(),
}))

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDOM>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock("@/lib/hooks", () => ({
  useErrorEvents: useErrorEventsMock,
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  useErrorEventsMock.mockReturnValue({
    data: {
      rows: [
        {
          service: "checkout-api",
          error_type: "TypeError",
          error_code: "ERR_500",
          error_message: "request failed",
          timestamp: "2026-11-20T09:00:00.000Z",
        },
      ],
    },
    isLoading: false,
    isError: false,
  })
})

describe("Errors page Explore navigation", () => {
  it("navigates once with the encoded service query when the actual action is clicked", () => {
    render(<ErrorsPage />)

    fireEvent.click(screen.getByText("TypeError"))
    fireEvent.click(screen.getByRole("button", { name: "Query Events in Explore" }))

    const query = 'from events | where service = "checkout-api" and (level = "error" or level = "fatal") | sort timestamp desc | limit 50'
    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith(`/explore?q=${encodeURIComponent(query)}`)
  })
})
