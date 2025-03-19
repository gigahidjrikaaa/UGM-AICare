import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    } & DefaultSession["user"];
  }
  
  /**
   * Extend the built-in user types
   */
  interface User {
    id: string;
    name: string;
    email: string;
    image?: string;
    role?: string; // Add role field
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string; // Add role field
  }
}