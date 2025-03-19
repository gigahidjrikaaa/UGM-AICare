import Image from 'next/image';
import Link from 'next/link';

export default function AdminFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[#000c24]/80 backdrop-blur-sm border-t border-white/10 py-4 px-6 mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-3 md:mb-0">
          <Image 
            src="/UGM_Lambang.png" 
            alt="UGM Logo" 
            width={24} 
            height={24} 
            className="mr-2"
          />
          <span className="text-xs text-gray-400">
            © {currentYear} UGM-AICare Admin. All rights reserved.
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/admin/help" className="text-xs text-gray-400 hover:text-white transition-colors">
            Help
          </Link>
          <Link href="/admin/terms" className="text-xs text-gray-400 hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/admin/privacy" className="text-xs text-gray-400 hover:text-white transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}