// Only load jest-dom matchers in jsdom environment
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom");
}
