import "server-only"

/**
 * How the Next.js server reaches the FastAPI backend.
 *
 * Both values are read from the server's environment at runtime and must never
 * use the NEXT_PUBLIC_ prefix: NEXT_PUBLIC_* values are inlined into the
 * JavaScript sent to browsers, and API_KEY is the secret the backend's
 * x-api-key gateway trusts. The "server-only" import makes the build fail if a
 * client component ever imports this module.
 */
export const backend = {
  url: process.env.API_URL || "http://localhost:8000",
  apiKey: process.env.API_KEY || "",
}
