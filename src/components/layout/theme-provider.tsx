import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

type Theme = "dark" | "light" | "system"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const STORAGE_KEY = "loxana-theme"

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyTheme(resolved: "dark" | "light") {
  const root = document.documentElement
  root.classList.remove("dark", "light")
  root.classList.add(resolved)
  root.setAttribute("data-theme", resolved)
  // Ensure background color paints immediately to prevent flash
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "dark"
  })

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
  }, [])

  // Apply resolved theme to document
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme(getSystemTheme())
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
