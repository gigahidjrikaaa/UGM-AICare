import AppLayout from "@/components/layout/AppLayout";

export default function MainAppPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}