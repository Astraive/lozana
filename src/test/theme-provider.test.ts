// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider, useTheme } from "@/components/layout/theme-provider";

type ChangeListener = () => void;

interface MockMediaQueryList {
  matches: boolean;
  setMatches: (matches: boolean) => void;
  emitChange: () => void;
}

function installMatchMedia(initialMatches: boolean): MockMediaQueryList {
  const listeners = new Set<ChangeListener>();
  const mql = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: ChangeListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: ChangeListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: ChangeListener) => {
      listeners.add(listener);
    },
    removeListener: (listener: ChangeListener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
    setMatches(next: boolean) {
      mql.matches = next;
    },
    emitChange() {
      for (const listener of [...listeners]) listener();
    },
  };

  const stub = vi.fn(() => mql);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: stub,
  });
  return mql;
}

function renderProvider(): { root: Root; container: HTMLElement } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(ThemeProvider, null, createElement(Probe)));
  });
  return { root, container };
}

function Probe() {
  const { resolvedTheme } = useTheme();
  return createElement("div", null, resolvedTheme);
}

describe("ThemeProvider system theme changes", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("re-renders context consumers with the new resolved theme when the OS theme changes", () => {
    localStorage.setItem("lozana-theme", "system");
    const mql = installMatchMedia(true);

    const { root, container } = renderProvider();
    try {
      expect(container.textContent).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      act(() => {
        mql.setMatches(false);
        mql.emitChange();
      });

      // The context value must follow the OS change, not just the DOM.
      expect(container.textContent).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it("does not let OS changes override an explicitly selected theme", () => {
    localStorage.setItem("lozana-theme", "light");
    const mql = installMatchMedia(true);

    const { root, container } = renderProvider();
    try {
      expect(container.textContent).toBe("light");

      act(() => {
        mql.setMatches(false);
        mql.emitChange();
      });

      expect(container.textContent).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
