"use client";

import { useState, useEffect } from "react";

interface User {
  id: number;
  role: string;
  email: string;
}

interface Session {
  user: User | null;
  loading: boolean;
}

export function useSession() {
  const [session, setSession] = useState<Session>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setSession({
          user: data.user,
          loading: false,
        });
      })
      .catch((err) => {
        console.error("Failed to fetch session:", err);
        setSession({
          user: null,
          loading: false,
        });
      });
  }, []);

  return session;
}
