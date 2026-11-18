import { describe, expect, it } from "vitest";
import {
  createInitialMenuState,
  menuReducer,
  type CommandMenuState,
} from "@/components/layout/command-menu-state";

function openViaKeyboard(state: CommandMenuState): CommandMenuState {
  return menuReducer(state, { type: "toggle" });
}

function typeFilter(state: CommandMenuState, filter: string): CommandMenuState {
  return menuReducer(state, { type: "setFilter", filter });
}

describe("command menu state reset", () => {
  it("starts closed with an empty filter and the first result highlighted", () => {
    expect(createInitialMenuState()).toEqual({
      open: false,
      filter: "",
      activeIndex: 0,
    });
  });

  it("does not carry a stale filter or selection into the next Cmd/Ctrl+K open", () => {
    let state = createInitialMenuState();

    // First session: open with the keyboard, type a filter and move the highlight.
    state = openViaKeyboard(state);
    state = typeFilter(state, "settings");
    state = menuReducer(state, { type: "setActiveIndex", activeIndex: 3 });
    expect(state).toEqual({ open: true, filter: "settings", activeIndex: 3 });

    // Close the menu (Escape, Enter/executeCommand, or another Cmd/Ctrl+K press).
    state = menuReducer(state, { type: "close" });
    expect(state.open).toBe(false);

    // Reopen via Cmd/Ctrl+K. The old filter and highlight must not survive.
    state = openViaKeyboard(state);
    expect(state.open).toBe(true);
    expect(state.filter).toBe("");
    expect(state.activeIndex).toBe(0);
  });

  it("resets on every open path, not just the keyboard toggle", () => {
    const dirty: CommandMenuState = {
      open: false,
      filter: "traces",
      activeIndex: 2,
    };

    expect(menuReducer(dirty, { type: "open" })).toEqual({
      open: true,
      filter: "",
      activeIndex: 0,
    });
    expect(menuReducer(dirty, { type: "setOpen", open: true })).toEqual({
      open: true,
      filter: "",
      activeIndex: 0,
    });
    // A second toggle from an already-open state must not clobber current input.
    expect(
      menuReducer({ ...dirty, open: true }, { type: "toggle" }),
    ).toEqual({ open: false, filter: "traces", activeIndex: 2 });
  });

  it("keeps the filter while closing and clears the highlight when it changes", () => {
    let state = openViaKeyboard(createInitialMenuState());
    state = typeFilter(state, "alerts");
    state = menuReducer(state, { type: "setActiveIndex", activeIndex: 1 });

    state = menuReducer(state, { type: "close" });
    expect(state).toEqual({ open: false, filter: "alerts", activeIndex: 1 });

    state = openViaKeyboard(state);
    expect(state.filter).toBe("");
    expect(state.activeIndex).toBe(0);

    state = typeFilter(state, "services");
    expect(state.filter).toBe("services");
    expect(state.activeIndex).toBe(0);
  });
});
