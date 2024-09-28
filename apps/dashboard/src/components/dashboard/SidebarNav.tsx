'use client';

import { buttonVariants } from '@openpreview/ui/components/button';
import { cn } from '@openpreview/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1',
        className,
      )}
      {...props}
    >
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            pathname === item.href
              ? 'bg-muted hover:bg-muted font-semibold text-primary'
              : 'hover:bg-muted/50 text-foreground hover:text-primary',
            'justify-between text-sm transition-colors duration-200 ease-in-out',
            'flex items-center px-3 py-2 rounded-md group'
          )}
        >
          {item.title}
          <ChevronRight className={cn(
            'h-4 w-4 opacity-0 transition-opacity duration-200',
            pathname === item.href ? 'opacity-100' : 'group-hover:opacity-100'
          )} />
        </Link>
      ))}
    </nav>
  );
}
