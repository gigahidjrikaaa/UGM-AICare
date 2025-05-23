import AppLayout from "@/components/layout/AppLayout"; // Adjust path if necessary
import { ReactNode, Suspense } from "react";
import GlobalSkeleton from "@/components/ui/GlobalSkeleton";

export default function MainAppPagesLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      <Suspense fallback={<GlobalSkeleton />}>
        {children}
      </Suspense>
    </AppLayout>
  );
}