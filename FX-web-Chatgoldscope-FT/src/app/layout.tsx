import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/AppProviders";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "GoldScope AI — XAU/USD Trading Copilot",
    template: "%s | GoldScope AI",
  },
  description:
    "An XAU/USD-focused AI trading copilot for chart review, market context, scenario analysis and risk awareness.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "GoldScope AI",
    description: "Understand your XAU/USD situation before your next decision.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
