import AppLayout from "@/components/layout/AppLayout";
import ToastProvider from "@/components/layout/ToastProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ProactiveMessagesProvider } from "@/contexts/ProactiveMessagesContext";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <I18nProvider storageKey="app_locale">
      <ProactiveMessagesProvider>
        <AppLayout>{children}</AppLayout>
      </ProactiveMessagesProvider>
      </I18nProvider>
    </ToastProvider>
  );
}