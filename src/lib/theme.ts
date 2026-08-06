import { useEffect } from "react";
import { useGym } from "@/lib/gym-store";

/**
 * Custom hook to apply the current theme, color preset, and design style to the DOM.
 * 
 * This hook synchronizes the application's theme state with the HTML element's
 * classes and data attributes, ensuring the correct visual theme is applied.
 */
export function useApplyTheme() {
  const theme = useGym((s) => s.settings.theme);
  const preset = useGym((s) => s.settings.preset);
  const designStyle = useGym((s) => s.settings.designStyle) || "glass";
  
  useEffect(() => {
    // Guard against server-side rendering
    if (typeof document === "undefined") return;
    
    const html = document.documentElement;
    
    // Remove existing theme classes to avoid conflicts
    html.classList.remove("dark", "light");
    
    // Apply the current theme class
    html.classList.add(theme);
    
    // Set attributes for color scheme and design style (glass, neo, classic)
    html.setAttribute("data-preset", preset);
    html.setAttribute("data-design-style", designStyle);
  }, [theme, preset, designStyle]);
}