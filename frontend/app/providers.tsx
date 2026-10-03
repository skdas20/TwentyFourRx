"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import RiaWidget from "@/components/assistant/RiaWidget";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster position="top-right" />
      <RiaWidget />
    </SessionProvider>
  );
}
