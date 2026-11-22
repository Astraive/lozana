// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import IncidentsPage from "@/pages/incidents"

const { reconstructIncidentMock, getIncidentGraphMock } = vi.hoisted(() => ({
  reconstructIncidentMock: vi.fn(),
  getIncidentGraphMock: vi.fn(),
}))

vi.mock("@/lib/api/cortex", () => ({
  reconstructIncident: reconstructIncidentMock,
  getIncidentGraph: getIncidentGraphMock,
}))

vi.mock("@/components/cortex/IncidentWorkbench", () => ({
  IncidentWorkbench: () => <div data-testid="incident-workbench" />,
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  reconstructIncidentMock.mockResolvedValue({})
  getIncidentGraphMock.mockResolvedValue({})
})

describe("Incidents page URL navigation", () => {
  it("resets the incident input while preserving reconstruction mode", async () => {
    render(
      <MemoryRouter initialEntries={["/incidents?incident_id=INC-1"]}>
        <Routes>
          <Route path="/incidents" element={<IncidentsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(reconstructIncidentMock).toHaveBeenCalledWith("INC-1", "fast")
    })

    fireEvent.change(screen.getByLabelText("Reconstruction mode"), {
      target: { value: "deep" },
    })
    await waitFor(() => {
      expect(reconstructIncidentMock).toHaveBeenCalledWith("INC-1", "deep")
    })
    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: "Reconstruct" }) as HTMLButtonElement).disabled
      ).toBe(false)
    })

    fireEvent.change(screen.getByLabelText("Incident ID or trace ID"), {
      target: { value: "INC-2" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Reconstruct" }))

    await waitFor(() => {
      expect(reconstructIncidentMock).toHaveBeenCalledWith("INC-2", "deep")
    })
    expect((screen.getByLabelText("Incident ID or trace ID") as HTMLInputElement).value).toBe(
      "INC-2"
    )
    expect((screen.getByLabelText("Reconstruction mode") as HTMLSelectElement).value).toBe(
      "deep"
    )
  })
})
