import { BrandHeader } from "@/components/brand-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scott's Experiment · Learning Companion Studio",
  description:
    "One-shot learning companion studio. Generate classroom-ready interactive lesson modules from a structured brief.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="size-full antialiased">
        <TooltipProvider delayDuration={300}>
          <div className="min-h-screen bg-gradient-to-b from-primary-50/40 via-background to-background">
            <BrandHeader />
            <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-24">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
