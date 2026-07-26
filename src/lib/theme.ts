import { useEffect } from "react";
import { useGym } from "@/lib/gym-store";

/**
 * Custom hook to apply the current theme and color preset to the DOM.
 * 
 * This hook synchronizes the application's theme state with the HTML element's
 * classes and data attributes, ensuring the correct visual theme is applied.
 * 
 * @remarks
 * - Removes existing "dark" and "light" classes before adding the current theme
 * - Sets the "data-preset" attribute for color scheme customization
 * - Runs automatically when theme or preset values change
 */
export function useApplyTheme() {
  const theme = useGym((s) => s.settings.theme);
  const preset = useGym((s) => s.settings.preset);
  
  useEffect(() => {
    // Guard against server-side rendering
    if (typeof document === "undefined") return;
    
    const html = document.documentElement;
    
    // Remove existing theme classes to avoid conflicts
    html.classList.remove("dark", "light");
    
    // Apply the current theme class
    html.classList.add(theme);
    
    // Set the preset attribute for color scheme
    html.setAttribute("data-preset", preset);
  }, [theme, preset]);
}