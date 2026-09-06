import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { JourneyProvider } from "@/components/JourneyProvider";
import { SiteChrome } from "@/components/SiteChrome";
import { langFromCookie } from "@/lib/i18n";
import "./globals.css";

/**
 * The title used to read "report a fraud in sixty seconds".
 *
 * That is the claim, and the claim is the one thing on this site that is not
 * settled: /evidence publishes the recorded runs with their sample size and
 * declines to call the figure a median below five of them. A browser tab and
 * every pasted link asserting it flatly was the last place the front door
 * outran the evidence page. It now says what the landing page's own headline
 * says, which asserts nothing that has not been shown.
 *
 * robots stays noindex on purpose and is not an oversight. Someone whose money
 * has just left their account must not reach a prototype from a search result;
 * the real routes are 1930 and cybercrime.gov.in, linked from every screen. It
 * does not affect link previews, which is what openGraph below is for.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://golden-hour-kappa.vercel.app"),
  title: "Golden Hour — send the bank the nine facts first",
  description:
    "A prototype that sends the bank-freeze half of a cyber fraud report first, and collects the police statement afterwards. Not affiliated with any government body.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Golden Hour",
    url: "/",
    title: "Golden Hour — send the bank the nine facts first",
    description:
      "A prototype of a re-sequenced cyber fraud report: the nine facts a bank needs to freeze an account, sent before the police complaint rather than after it. Not a government service, and it freezes nothing.",
  },
  twitter: { card: "summary" },
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
