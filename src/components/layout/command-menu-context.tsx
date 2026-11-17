import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface CommandMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMenu: () => void;
  toggleMenu: () => void;
}

// Default no-op value keeps the components usable in isolation (and in tests)
// even when no provider is mounted.
const CommandMenuContext = createContext<CommandMenuContextValue>({
  open: false,
  setOpen: () => {},
  openMenu: () => {},
  toggleMenu: () => {},
});

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openMenu = useCallback(() => setOpen(true), []);
  const toggleMenu = useCallback(() => setOpen((value) => !value), []);

  return (
    <CommandMenuContext.Provider value={{ open, setOpen, openMenu, toggleMenu }}>
      {children}
    </CommandMenuContext.Provider>
  );
}

export function useCommandMenu(): CommandMenuContextValue {
  return useContext(CommandMenuContext);
}
