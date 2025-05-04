import Link from 'next/link';
import Image from 'next/image';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#001545] to-[#001D58] text-white mt-auto z-10">
      {/* Top footer section with columns */}
      <div className="mx-auto pt-12 pb-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo and about column */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <Image 
                src="/UGM_Lambang.png" 
                alt="UGM Logo" 
                width={48} 
                height={48} 
                className="mr-3"
                priority
              />
              <div>
                <h2 className="text-xl font-bold">UGM-AICare</h2>
                <p className="text-[#FFCA40] text-xs">Mental Health Support</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6 max-w-md">
              Aika is an AI-powered mental health companion developed by Universitas Gadjah Mada to support student wellbeing and provide accessible emotional support.
            </p>
            <div className="flex space-x-4 mb-8">
              <SocialLink href="https://facebook.com/ugm.id" icon={<FaFacebookF size={16} />} label="Facebook" />
              <SocialLink href="https://twitter.com/ugm" icon={<FaTwitter size={16} />} label="Twitter" />
              <SocialLink href="https://instagram.com/ugm" icon={<FaInstagram size={16} />} label="Instagram" />
              <SocialLink href="https://linkedin.com/school/universitas-gadjah-mada" icon={<FaLinkedinIn size={16} />} label="LinkedIn" />
              <SocialLink href="https://youtube.com/ugm" icon={<FaYoutube size={16} />} label="YouTube" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#FFCA40]">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { href: "/aika", text: "Talk to Aika" },
                { href: "/resources", text: "Resources" },
                { href: "/about", text: "About Us" },
                { href: "/faq", text: "FAQs" },
                { href: "/contact", text: "Contact" },
              ].map(link => (
                <FooterLink key={link.href} href={link.href}>
                  {link.text}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#FFCA40]">Resources</h3>
            <ul className="space-y-3">
              {[
                { href: "/crisis-support", text: "Crisis Support" },
                { href: "/mental-health-articles", text: "Articles" },
                { href: "/self-help-tools", text: "Self-Help Tools" },
                { href: "/counseling", text: "Counseling Services" },
              ].map(link => (
                <FooterLink key={link.href} href={link.href}>
                  {link.text}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#FFCA40]">Contact</h3>
            <ul className="space-y-3">
              {[
                { href: "https://linkedin.com/in/gigahidjrikaaa", name: "Giga Hidjrika Aura Adkhy", role: "(Lead Developer)" },
                { href: "https://linkedin.com/in/", name: "Ega Rizky Setiawan", role: "(Developer)" }, // TODO: Add correct LinkedIn URL
                { href: "https://linkedin.com/in/", name: "Bimo Sunarfri Hartono", role: "(Advisor/Lecturer)" }, // TODO: Add correct LinkedIn URL
              ].map(contact => (
                <FooterLink key={contact.name} href={contact.href} className='text-gray-200 text-sm'>
                  <div>
                    <span className='block text-md font-bold'>{contact.name}</span>
                    <span className='block'>{contact.role}</span>
                  </div>
                </FooterLink>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom footer with copyright and legal */}
      <div className="border-t border-white/10 bg-[#001545]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image 
                src="/UGM_Tipografi.png" 
                alt="UGM" 
                width={80} 
                height={20} 
                className="opacity-80 bg-white p-1 rounded-sm"
              />
              <span className="ml-3 text-sm text-gray-400">AICare Team</span>
            </div>
            <div className="text-gray-400 text-xs">
              <p className="mb-2 md:mb-0">© {new Date().getFullYear()} Universitas Gadjah Mada. All rights reserved.</p>
            </div>
            <div className="flex space-x-6 text-xs text-gray-400">
              <Link href="/privacy-policy" className="hover:text-[#FFCA40] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="hover:text-[#FFCA40] transition-colors">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="hover:text-[#FFCA40] transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Helper component for social media links
interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function SocialLink({ href, icon, label }: SocialLinkProps) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      aria-label={label}
      className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#FFCA40]/80 hover:text-[#001D58] flex items-center justify-center transition-all duration-300"
    >
      {icon}
    </a>
  );
}

// Helper component for footer links
interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}
function FooterLink({ href, children, className }: FooterLinkProps) {
  return (
    <li>
      <Link 
        href={href} 
        className={className || "text-sm text-gray-300 hover:text-[#FFCA40] transition-colors relative group"}
      >
        <span className="inline-block">
          {children}
        </span>
        <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#FFCA40] group-hover:w-full transition-all duration-300"></span>
      </Link>
    </li>
  );
}