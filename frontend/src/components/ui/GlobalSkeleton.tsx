"use client";

import { usePathname } from "next/navigation";

export default function GlobalSkeleton() {
  const pathname = usePathname();
  
  // Different skeletons based on route pattern
  if (pathname?.startsWith("/aika")) {
    return <AikaPageSkeleton />;
  } else if (pathname?.startsWith("/admin")) {
    return <AdminPageSkeleton />;
  } else {
    return <DefaultPageSkeleton />;
  }
}

function DefaultPageSkeleton() {
  return (
    <div className="flex-grow animate-pulse">
      <div className="h-[80vh] bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center p-4">
          <div className="bg-white/10 h-20 w-48 mx-auto rounded-lg mb-6" />
          <div className="bg-white/10 h-6 w-3/4 mx-auto rounded-md mb-2" />
          <div className="bg-white/10 h-6 w-1/2 mx-auto rounded-md mb-8" />
          <div className="bg-white/10 h-12 w-40 mx-auto rounded-full" />
        </div>
      </div>
    </div>
  );
}

function AikaPageSkeleton() {
  return (
    <div className="flex-grow bg-gradient-to-b from-[#001D58] to-[#00308F] p-4 animate-pulse">
      <div className="max-w-4xl mx-auto flex flex-col h-full">
        <div className="space-y-4 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`w-2/3 h-16 rounded-lg ${i % 2 === 0 ? 'bg-white/20' : 'bg-white/10'}`} />
            </div>
          ))}
        </div>
        <div className="mt-auto">
          <div className="bg-white/10 h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function AdminPageSkeleton() {
  return (
    <div className="flex-grow bg-[#001D58] p-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-4 h-24">
            <div className="h-4 w-24 mb-2 bg-white/10 rounded-md" />
            <div className="h-8 w-16 bg-white/10 rounded-md" />
          </div>
        ))}
      </div>
      <div className="w-full h-96 bg-white/5 rounded-lg" />
    </div>
  );
}