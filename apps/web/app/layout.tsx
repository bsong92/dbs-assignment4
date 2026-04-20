import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Navigation from "./navigation";
import MouseTrail from "./mouse-trail";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Earthquake Tracker",
  description: "Live global earthquake feed with personalized location alerts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <MouseTrail />
        <ClerkProvider>
          <Navigation />
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-10">
            {children}
          </main>
          <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
            Data: USGS Earthquake Hazards Program · Updates every 60s
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
