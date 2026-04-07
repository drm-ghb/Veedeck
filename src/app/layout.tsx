import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Veedeck – Feedback do wizualizacji",
  description: "Centralizuj feedback do renderów w jednym miejscu",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("veedeck-theme")?.value;
  const isDark = themeCookie === "dark";

  return (
    <html
      lang="pl"
      className={`${inter.variable} ${dmSans.variable} h-full antialiased${isDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
