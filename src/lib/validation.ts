/** Shared input validation utilities */

export const MAX_LENGTHS = {
  comment: 10_000,
  reply: 5_000,
  title: 500,
  description: 20_000,
  name: 255,
};

/** Password must be 8+ chars with at least one lowercase, uppercase, and digit */
export function validatePassword(pwd: string): boolean {
  return (
    typeof pwd === "string" &&
    pwd.length >= 8 &&
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd)
  );
}

/** Escape HTML special characters to prevent injection in email templates */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
