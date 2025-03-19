"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function FooterWrapper() {
  const pathname = usePathname();
  
  // Don't render the footer on the Aika chat page or admin subpages
  if (pathname?.startsWith('/aika') || 
     (pathname?.startsWith('/admin/') && pathname !== '/admin')) {
    return null;
  }
  
  return <Footer />;
}