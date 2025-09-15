"use client";

import {useLocale, usePathname, useRouter} from 'next-intl/client';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => router.replace(pathname, {locale: e.target.value as 'en' | 'id'})}
      className="px-2 py-1 rounded-md bg-white/10 text-white text-xs border border-white/20"
    >
      <option className="bg-[#001030]" value="en">EN</option>
      <option className="bg-[#001030]" value="id">ID</option>
    </select>
  );
}
