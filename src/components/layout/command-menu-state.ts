export type CommandMenuState = {
  open: boolean;
  filter: string;
  activeIndex: number;
};

export type CommandMenuAction =
  | { type: "toggle" }
  | { type: "open" }
  | { type: "close" }
  | { type: "setOpen"; open: boolean }
  | { type: "setFilter"; filter: string }
  | { type: "setActiveIndex"; activeIndex: number };

export function createInitialMenuState(): CommandMenuState {
  return { open: false, filter: "", activeIndex: 0 };
}

/**
 * Central state machine for the command menu.
 *
 * Every transition that opens the menu goes through the `open` case, which
 * clears the filter and highlight. Previously the Cmd/Ctrl+K handler toggled
 * `open` directly and the reset lived only in `onOpenChange`; Base UI does not
 * fire `onOpenChange` for a controlled `open` prop change, so a filter typed in
 * an earlier session survived into the next open. Routing all open paths
 * (keyboard toggle, `onOpenChange`, or an explicit open action) through this
 * reducer makes the reset unconditional.
 */
export function menuReducer(
  state: CommandMenuState,
  action: CommandMenuAction,
): CommandMenuState {
  switch (action.type) {
    case "toggle":
      return state.open
        ? menuReducer(state, { type: "close" })
        : menuReducer(state, { type: "open" });
    case "open":
      return state.open
        ? state
        : { ...state, open: true, filter: "", activeIndex: 0 };
    case "close":
      return state.open ? { ...state, open: false } : state;
    case "setOpen":
      return action.open
        ? menuReducer(state, { type: "open" })
        : menuReducer(state, { type: "close" });
    case "setFilter":
      return { ...state, filter: action.filter, activeIndex: 0 };
    case "setActiveIndex":
      return { ...state, activeIndex: action.activeIndex };
    default:
      return state;
  }
}
