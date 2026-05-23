(() => {
  const storedTheme = localStorage.getItem("buildledger-theme") || "system";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let resolvedTheme = storedTheme;

  if (storedTheme === "system") {
    resolvedTheme = prefersDark ? "dark" : "light";
  }

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
})();
