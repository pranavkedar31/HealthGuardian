/**
 * Theme management utility for HealthGuardian (Light Mode default, with Dark Mode toggle)
 */

export function getStoredTheme() {
  if (typeof localStorage === "undefined") return "light";
  const stored = localStorage.getItem("hg_theme");
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  // Default to clean Light Mode
  return "light";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return "light";
  const targetTheme = theme === "dark" ? "dark" : "light";
  const root = document.documentElement;
  const body = document.body;

  if (targetTheme === "dark") {
    root.classList.add("dark");
    if (body) body.classList.add("dark");
  } else {
    root.classList.remove("dark");
    if (body) body.classList.remove("dark");
  }

  root.setAttribute("data-theme", targetTheme);

  try {
    localStorage.setItem("hg_theme", targetTheme);
  } catch (e) {
    console.error("Failed to save theme to localStorage:", e);
  }

  window.dispatchEvent(new CustomEvent("hg-theme-change", { detail: targetTheme }));
  return targetTheme;
}

export function toggleTheme() {
  const current = getStoredTheme();
  const next = current === "dark" ? "light" : "dark";
  return applyTheme(next);
}

export function resetToSystemDefault() {
  try {
    localStorage.removeItem("hg_theme");
  } catch {
    /* ignore */
  }
  return applyTheme("light");
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}
