'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      className={`text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center px-4 py-2 ${
        pathname === href ? 'bg-accent text-accent-foreground' : ''
      }`}
    >
      <Icon className="mr-3 h-5 w-5" />
      {children}
    </Link>
  );
}