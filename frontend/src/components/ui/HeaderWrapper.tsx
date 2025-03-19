"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function HeaderWrapper() {
  const pathname = usePathname();

  const listOfPaths = ['/aika', '/admin/*'];
  
  // Don't render the header on the listed pages
  if (listOfPaths.some((path) => pathname?.startsWith(path))) {
    return null;
  }
  
  return <Header />;
}