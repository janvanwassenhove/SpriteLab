import { NextResponse } from "next/server";

/**
 * Returns which AI API keys are configured via server environment variables.
 * Only reveals presence (boolean) and an anonymised hint — never the actual key.
 */
export async function GET() {
  const openai = process.env.OPENAI_API_KEY ?? "";
  const gemini = process.env.GEMINI_API_KEY ?? "";

  return NextResponse.json({
    openai: {
      configured: openai.length > 0,
      hint: anonymise(openai),
    },
    gemini: {
      configured: gemini.length > 0,
      hint: anonymise(gemini),
    },
  });
}

/** Show only the first 3 and last 3 characters, mask the rest. */
function anonymise(key: string): string {
  if (!key || key.length < 8) return "";
  return `${key.slice(0, 3)}${"•".repeat(Math.min(key.length - 6, 20))}${key.slice(-3)}`;
}
