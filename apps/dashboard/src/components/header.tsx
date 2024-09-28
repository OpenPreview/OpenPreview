'use client';

import { Button } from '@openpreview/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openpreview/ui/components/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@openpreview/ui/components/sheet';
import { ArrowUpRight } from 'lucide-react';

import { ChevronDown, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

type headerType = {
  logo: {
    href: string;
    logo: string | React.ReactNode;
  };
  navItems: {
    label: string;
    href: string;
    external?: boolean;
    hasDropdown?: boolean;
    dropdownItems?: {
      label: string;
      href: string;
      external?: boolean;
    }[];
  }[];
  buttons: {
    label: string;
    variant: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive';
    href: string;
  }[];
};

const headerData: headerType = {
  logo: {
    href: '/',
    logo: <Image src={'/images/logo.png'} alt="Logo" width={40} height={40} />,
  },
  navItems: [
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Features', href: '/#features' },
    { label: 'FAQ', href: '/#faq' },
    {
      label: 'Docs',
      href:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3001'
          : 'https://docs.openpreview.dev',
      external: true,
    },
  ],
  buttons: [
    { label: 'Login', variant: 'ghost', href: '/login' },
    { label: 'Register', variant: 'default', href: '/register' },
  ],
};

export default function Header() {
  const [isMobileExtraOpen, setIsMobileExtraOpen] = useState(false);

  const toggleMobileExtra = () => setIsMobileExtraOpen(!isMobileExtraOpen);

  return (
    <header className="w-full px-4 py-4 sm:px-6" dir="ltr">
      <div className="mx-auto max-w-5xl">
        <nav className="bg-background relative flex items-center justify-between rounded-md border px-2">
          <div className="flex items-center space-x-4 py-1">
            <Link href={headerData.logo.href}>{headerData.logo.logo}</Link>
          </div>

          {/* Desktop Menu */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 transform md:flex">
            <div className="space-x-4 lg:space-x-6">
              {headerData.navItems.map((item, index) => (
                <div key={index} className="relative inline-flex items-center">
                  {item.hasDropdown ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="text-foreground hover:text-foreground/80 flex items-center space-x-1 text-base font-medium">
                        <span>{item.label}</span>
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {item.dropdownItems.map(
                          (dropdownItem, dropdownIndex) => (
                            <DropdownMenuItem key={dropdownIndex} asChild>
                              <Link
                                href={dropdownItem.href}
                                className="text-foreground hover:bg-accent w-full"
                              >
                                {dropdownItem.label}
                              </Link>
                            </DropdownMenuItem>
                          ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      className="text-foreground hover:text-foreground/80 flex items-center gap-1 text-base font-medium"
                    >
                      {item.label}
                      {item.external && <ArrowUpRight className="h-4 w-4" />}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden items-center space-x-2 md:flex">
            {headerData.buttons.map((button, index) => (
              <Button
                key={index}
                variant={button.variant as any}
                className="text-base font-medium"
                asChild
              >
                <Link href={button.href}>{button.label}</Link>
              </Button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4">
                {headerData.navItems.map((item, index) => (
                  <div key={index}>
                    {item.hasDropdown ? (
                      <>
                        <button
                          onClick={toggleMobileExtra}
                          className="text-foreground hover:text-foreground/80 flex w-full items-center justify-between text-base font-medium"
                        >
                          <span>{item.label}</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {isMobileExtraOpen && (
                          <div className="mt-2 space-y-2 pl-4">
                            {item.dropdownItems.map(
                              (dropdownItem, dropdownIndex) => (
                                <Link
                                  key={dropdownIndex}
                                  href={dropdownItem.href}
                                  target={
                                    dropdownItem.external ? '_blank' : undefined
                                  }
                                  className="text-foreground hover:text-foreground/80 block text-base"
                                >
                                  {dropdownItem.label}
                                </Link>
                              ),
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-foreground hover:text-foreground/80 block text-base font-medium"
                      >
                        {item.label}
                      </Link>
                    )}
                  </div>
                ))}
                {headerData.buttons.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.variant as any}
                    className="justify-start text-base font-medium"
                    asChild
                  >
                    <Link href={button.href}>{button.label}</Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}
