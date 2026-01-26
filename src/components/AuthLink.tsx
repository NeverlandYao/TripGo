"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";

export function AuthLink({
  href,
  className,
  children
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useSession();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/login`);
    } else {
      router.push(href);
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
