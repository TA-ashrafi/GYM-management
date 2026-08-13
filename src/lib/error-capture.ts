/**
 * Error capture utility for server-side error recovery
 *
 * This module captures unhandled errors and unhandled promise rejections
 * so that the server can recover the original error stack when h3 has
 * already swallowed the error into a generic 500 Response.
 */

// Stores the captured error with a timestamp for TTL-based expiration
let lastCapturedError: { error: unknown; at: number } | undefined;

// Time-to-live for captured errors (5 seconds)
const TTL_MS = 5_000;

/**
 * Records an error with the current timestamp
 * @param error - The error to capture
 */
function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

// Register global error handlers when in a browser environment
if (typeof globalThis.addEventListener === "function") {
  // Capture unhandled errors
  globalThis.addEventListener("error", (event) =>
    record((event as ErrorEvent).error ?? event),
  );

  // Capture unhandled promise rejections
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

/**
 * Retrieves and clears the last captured error if it hasn't expired
 * @returns The captured error, or undefined if none exists or it has expired
 */
export function consumeLastCapturedError(): unknown {
  // No error captured
  if (!lastCapturedError) return undefined;

  // Check if the error has expired
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }

  // Retrieve and clear the error
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
