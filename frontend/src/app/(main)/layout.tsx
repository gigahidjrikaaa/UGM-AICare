import AppLayout from "@/components/layout/AppLayout";
import ToastProvider from "@/components/layout/ToastProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppLayout>{children}</AppLayout>
    </ToastProvider>
  );
}