import { useEffect } from "react";
import { useGym } from "@/lib/gym-store";

export function useApplyTheme() {
  const theme = useGym((s) => s.settings.theme);
  const preset = useGym((s) => s.settings.preset);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    html.classList.add(theme);
    html.setAttribute("data-preset", preset);
  }, [theme, preset]);
}
