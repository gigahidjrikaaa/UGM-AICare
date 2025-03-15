"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function HeaderWrapper() {
  const pathname = usePathname();
  
  // Don't render the header on the Aika chat page
  if (pathname?.startsWith('/aika')) {
    return null;
  }
  
  return <Header />;
}