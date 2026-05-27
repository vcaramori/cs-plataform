"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

type ThemeProviderProps = React.PropsWithChildren<{
  attribute?: "class"
  defaultTheme?: Theme
  forcedTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}>

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const {
    attribute = "class",
    defaultTheme = "light",
    forcedTheme,
    enableSystem = true,
    disableTransitionOnChange = false,
  } = props
  const [theme, setThemeState] = React.useState<Theme>(forcedTheme ?? defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    if (forcedTheme) {
      setThemeState(forcedTheme)
      return
    }
    const storedTheme = window.localStorage.getItem("theme") as Theme | null
    setThemeState(storedTheme ?? defaultTheme)
    setSystemTheme(getSystemTheme())
  }, [defaultTheme, forcedTheme])

  React.useEffect(() => {
    if (!enableSystem || forcedTheme) return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemTheme(getSystemTheme())

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [enableSystem, forcedTheme])

  const resolvedTheme = forcedTheme 
    ? (forcedTheme === "system" ? systemTheme : forcedTheme as "light" | "dark")
    : (theme === "system" && enableSystem ? systemTheme : theme === "dark" ? "dark" : "light")

  React.useEffect(() => {
    const root = document.documentElement
    const previousTransition = root.style.getPropertyValue("transition")

    if (disableTransitionOnChange) {
      root.style.setProperty("transition", "none")
    }

    if (attribute === "class") {
      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
    }

    root.style.colorScheme = resolvedTheme

    if (disableTransitionOnChange) {
      window.setTimeout(() => {
        if (previousTransition) {
          root.style.setProperty("transition", previousTransition)
        } else {
          root.style.removeProperty("transition")
        }
      }, 0)
    }
  }, [attribute, disableTransitionOnChange, resolvedTheme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    if (forcedTheme) return
    setThemeState(nextTheme)
    window.localStorage.setItem("theme", nextTheme)
  }, [forcedTheme])

  const value = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [resolvedTheme, setTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }

  return context
}
