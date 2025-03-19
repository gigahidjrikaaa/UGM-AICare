import Link from 'next/link';
import Image from 'next/image';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#001545] to-[#001D58] text-white mt-auto">
      {/* Top footer section with columns */}
      <div className="max-w-7xl mx-auto pt-12 pb-8 px-4 sm:px-6">
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
              <FooterLink href="/aika">Talk to Aika</FooterLink>
              <FooterLink href="/resources">Resources</FooterLink>
              <FooterLink href="/about">About Us</FooterLink>
              <FooterLink href="/faq">FAQs</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#FFCA40]">Resources</h3>
            <ul className="space-y-3">
              <FooterLink href="/crisis-support">Crisis Support</FooterLink>
              <FooterLink href="/mental-health-articles">Articles</FooterLink>
              <FooterLink href="/self-help-tools">Self-Help Tools</FooterLink>
              <FooterLink href="/counseling">Counseling Services</FooterLink>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#FFCA40]">Contact</h3>
            <address className="not-italic text-sm text-gray-300 space-y-3">
              <p>Department of Electrical and Information Engineering</p>
              <p>Universitas Gadjah Mada</p>
              <p>Yogyakarta, Indonesia</p>
              <p className="pt-2">
                <a href="mailto:aicare@ugm.ac.id" className="hover:text-[#FFCA40] transition-colors">
                  aicare@ugm.ac.id
                </a>
              </p>
            </address>
          </div>
        </div>

        {/* Newsletter Signup - Modern Glass Card */}
        <div className="mt-12 mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-5 gap-4 items-center">
            <div className="md:col-span-3">
              <h3 className="text-lg font-semibold mb-1">Stay Updated</h3>
              <p className="text-sm text-gray-300">Subscribe to receive mental health tips and resources</p>
            </div>
            <div className="md:col-span-2">
              <form className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="bg-white/10 border border-white/20 rounded-l-md px-4 py-2 flex-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA40]"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#FFCA40] hover:bg-[#ffb700] text-[#001D58] font-medium px-4 rounded-r-md transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
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
}

function FooterLink({ href, children }: FooterLinkProps) {
  return (
    <li>
      <Link 
        href={href} 
        className="text-sm text-gray-300 hover:text-[#FFCA40] transition-colors relative group"
      >
        <span className="inline-block">
          {children}
        </span>
        <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#FFCA40] group-hover:w-full transition-all duration-300"></span>
      </Link>
    </li>
  );
}