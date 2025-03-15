import Image from 'next/image';
import Link from 'next/link';
import { FaComments, FaHeartbeat, FaLock } from 'react-icons/fa';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F]">
      {/* Navigation */}
      <nav className="py-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <Image 
            src="/UGM_Lambang.png" 
            alt="UGM Logo" 
            width={50} 
            height={50} 
            className="mr-3"
          />
          <span className="text-white text-xl font-bold">UGM-AICare</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/about" className="text-white hover:text-[#FFCA40] transition">
            About
          </Link>
          <Link href="/contact" className="text-white hover:text-[#FFCA40] transition">
            Contact
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Left column: Heading and Description */}
          <div className="lg:w-1/2 text-center lg:text-left mb-10 lg:mb-0">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Meet <span className="text-[#FFCA40]">Aika</span>, Your Mental Health Companion
            </h1>
            <p className="text-xl text-gray-200 mt-6 max-w-lg mx-auto lg:mx-0">
              A supportive AI assistant designed to help UGM students navigate emotional challenges and promote mental wellbeing.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <GoogleSignInButton />
              <Link href="/aika" className="px-8 py-3 bg-white bg-opacity-20 text-[#001D58] rounded-full font-bold text-lg flex items-center justify-center hover:bg-opacity-30 transition backdrop-blur-sm">
                Try Demo
              </Link>
            </div>
          </div>
          
          {/* Right column: Image/Illustration */}
          <div className="lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative w-[300px] h-[300px] lg:w-[400px] lg:h-[400px]">
              <Image 
                src="/aika-avatar.png" 
                alt="Aika Character" 
                fill
                className="object-contain"
                priority
              />
              <div className="absolute -bottom-6 -right-6 bg-white bg-opacity-15 backdrop-blur-md p-4 rounded-lg border border-white border-opacity-20">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-[#FFCA40] rounded-full animate-pulse"></div>
                  <span className="text-black font-medium">Aika is ready to chat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white bg-opacity-5 backdrop-blur-sm py-20 text-[#001D58]">
        <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-[#001D58] text-center mb-16">How Aika Can Help You</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-xl border border-white border-opacity-20 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-[#FFCA40] rounded-full flex items-center justify-center text-[#001D58] text-2xl mb-4">
                <FaComments />
              </div>
              <h3 className="text-xl font-bold mb-3">24/7 Support</h3>
              <p className="text-[#00308F]">
                Aika is always available to listen and provide emotional support whenever you need someone to talk to.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-xl border border-white border-opacity-20 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-[#FFCA40] rounded-full flex items-center justify-center text-[#001D58] text-2xl mb-4">
                <FaHeartbeat />
              </div>
              <h3 className="text-xl font-bold  mb-3">Wellbeing Resources</h3>
              <p className="text-[#00308F]">
                Access personalized resources and techniques to help manage stress, anxiety, and improve overall mental wellbeing.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-xl border border-white border-opacity-20 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-[#FFCA40] rounded-full flex items-center justify-center text-[#001D58] text-2xl mb-4">
                <FaLock />
              </div>
              <h3 className="text-xl font-bold mb-3">Private & Secure</h3>
              <p className="text-[#00308F]">
                Your conversations with Aika are private and secure. We prioritize your confidentiality and data protection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials/Quote Section */}
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <blockquote className="text-2xl italic">
          &quot;Mental health is not a destination, but a process. It&apos;s about how you drive, not where you&apos;re going.&quot;
        </blockquote>
        <p className="text-[#FFCA40] mt-4 font-medium">— UGM Counseling Center</p>
      </div>

      {/* Footer */}
      <footer className="bg-[#001545] py-12 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center mb-6">
            <Image 
              src="/UGM_Lambang.png" 
              alt="UGM Logo" 
              width={60} 
              height={60} 
            />
          </div>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-6">
            Developed by Department of Electrical and Information Engineering (DEIE) of Universitas Gadjah Mada
          </p>
          <div className="flex items-center justify-center mb-6">
            <span className="text-gray-400 mr-2">Built with ❤️ by</span>
            <Image 
              src="/UGM_Tipografi.png" 
              alt="UGM" 
              width={80} 
              height={20} 
              className="opacity-80 bg-white p-1 rounded-sm"
            />
            <span className="text-gray-400 ml-2">AICare Team</span>
          </div>
          <p className="text-sm text-gray-400">© 2025 Universitas Gadjah Mada. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}