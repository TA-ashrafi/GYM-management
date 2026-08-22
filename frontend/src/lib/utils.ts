import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for conditionally combining Tailwind CSS classes.
 * 
 * This function merges multiple class values using clsx for conditional logic
 * and tailwind-merge to properly handle conflicting Tailwind classes.
 * 
 * @param inputs - Array of class values (strings, objects, arrays, or falsy values)
 * @returns A merged string of class names with Tailwind conflicts resolved
 * 
 * @example
 * // Basic usage
 * cn("px-2 py-1", "bg-blue-500")
 * 
 * @example
 * // With conditional classes
 * cn("text-sm", { "font-bold": isActive, "text-red-500": hasError })
 * 
 * @example
 * // Tailwind conflicts are automatically resolved
 * cn("p-4", "p-6") // Returns "p-6"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}