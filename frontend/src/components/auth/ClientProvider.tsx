"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

type Props = {
  children: React.ReactNode;
};

const ClientProvider = ({ children }: Props) => {
  return (
    <SessionProvider refetchInterval={300} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
};

export default ClientProvider;