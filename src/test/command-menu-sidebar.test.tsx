// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandMenu } from "@/components/layout/command-menu";
import { CommandMenuProvider } from "@/components/layout/command-menu-context";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("@/lib/hooks", () => ({
  useCollectorHealth: () => ({ isSuccess: true, data: { status: "ok" } }),
}));

afterEach(cleanup);

it("opens the command menu from the sidebar shortcut hint", async () => {
  render(
    <MemoryRouter>
      <CommandMenuProvider>
        <Sidebar open onClose={() => {}} />
        <CommandMenu />
      </CommandMenuProvider>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: /to search/i }));

  expect(await screen.findByRole("combobox")).toBeTruthy();
});
