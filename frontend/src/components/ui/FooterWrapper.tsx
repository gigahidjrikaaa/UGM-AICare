"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function FooterWrapper() {
  const pathname = usePathname();
  
  // Don't render the footer on the Aika chat page
  if (pathname?.startsWith('/aika')) {
    return null;
  }
  
  return <Footer />;
}