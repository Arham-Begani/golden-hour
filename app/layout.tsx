import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { JourneyProvider } from "@/components/JourneyProvider";
import { SiteChrome } from "@/components/SiteChrome";
import { langFromCookie } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golden Hour — report a fraud in sixty seconds",
  description:
    "A prototype that sends the bank-freeze half of a cyber fraud report first, and collects the police statement afterwards. Not affiliated with any government body.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0b",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the language server-side so Hindi does not flash English first.
  const lang = langFromCookie((await cookies()).get("gh_lang")?.value);

  return (
    <html lang={lang}>
      <body className="antialiased">
        <JourneyProvider initialLang={lang}>
          <SiteChrome>{children}</SiteChrome>
        </JourneyProvider>
      </body>
    </html>
  );
}
