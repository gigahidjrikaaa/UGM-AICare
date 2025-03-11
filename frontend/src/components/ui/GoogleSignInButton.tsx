"use client";

import { FaGoogle } from 'react-icons/fa';

export default function GoogleSignInButton() {
  return (
    <button 
      className="px-8 py-3 bg-[#FFCA40] text-[#001D58] rounded-full font-bold text-lg flex items-center justify-center hover:bg-[#FFD970] transition shadow-lg"
      onClick={() => window.location.href = '/api/auth/signin'}
    >
      <FaGoogle className="mr-2" /> Sign in with Google
    </button>
  );
}