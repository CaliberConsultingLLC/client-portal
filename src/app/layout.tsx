import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Caliber Consulting LLC | People & Culture Solutions",
    template: "%s | Caliber Consulting LLC",
  },
  description:
    "People and culture solutions including culture surveys, leadership development, sentiment analysis, and actionable reporting for organizations that invest in their people.",
  keywords: [
    "employee experience",
    "culture survey",
    "leadership development",
    "sentiment analysis",
    "organizational consulting",
    "employee engagement",
  ],
  openGraph: {
    type: "website",
    siteName: "Caliber Consulting LLC",
    locale: "en_US",
  },
  icons: {
    icon: "/CClogo3.png",
    shortcut: "/CClogo3.png",
    apple: "/CClogo3.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-surface-2 font-sans text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
