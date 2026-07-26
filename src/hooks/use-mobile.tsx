import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect if the current viewport is mobile-sized.
 * 
 * This hook uses the `window.matchMedia` API to listen for viewport changes
 * and returns a boolean indicating whether the screen width is below the
 * mobile breakpoint (768px by default).
 * 
 * @returns {boolean} `true` if the viewport is mobile-sized, `false` otherwise
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *   return (
 *     <div>
 *       {isMobile ? "Mobile view" : "Desktop view"}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Create a media query list for mobile breakpoint
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Handler for when the viewport changes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Add event listener and set initial state
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // Clean up event listener on unmount
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Return boolean value (defaults to false if state is undefined)
  return !!isMobile;
}