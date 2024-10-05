'use client';

import { useUser } from '@/hooks/useUser';
import { Button } from '@openpreview/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openpreview/ui/components/dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown, Github, Menu } from 'lucide-react';
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
    {
      label: 'Login',
      variant: 'ghost',
      href: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
    {
      label: 'Register',
      variant: 'default',
      href: `${process.env.NEXT_PUBLIC_APP_URL}/register`,
    },
  ],
};

export default function Header() {
  const { user, isLoading } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileExtraOpen, setIsMobileExtraOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
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
            {user && !isLoading ? (
              <Button className="text-base font-medium" asChild>
                <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}>
                  Enter Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-base font-medium"
                  asChild
                >
                  <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/login`}>
                    Login
                  </Link>
                </Button>
                <Button
                  variant="default"
                  className="text-base font-medium"
                  asChild
                >
                  <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/register`}>
                    Register
                  </Link>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-base font-medium"
              asChild
            >
              <Link
                href="https://github.com/openpreview/openpreview"
                target="_blank"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-background absolute right-0 top-full z-50 mt-2 w-full rounded-md border p-4 shadow-lg md:hidden"
              >
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
                          <AnimatePresence>
                            {isMobileExtraOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-2 space-y-2 pl-4"
                              >
                                {item.dropdownItems.map(
                                  (dropdownItem, dropdownIndex) => (
                                    <Link
                                      key={dropdownIndex}
                                      href={dropdownItem.href}
                                      target={
                                        dropdownItem.external
                                          ? '_blank'
                                          : undefined
                                      }
                                      className="text-foreground hover:text-foreground/80 block text-base"
                                    >
                                      {dropdownItem.label}
                                    </Link>
                                  ),
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                  {user ? (
                    <Button
                      className="justify-start text-base font-medium"
                      asChild
                    >
                      <Link
                        href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
                      >
                        Enter Dashboard
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="justify-start text-base font-medium"
                        asChild
                      >
                        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/login`}>
                          Login
                        </Link>
                      </Button>
                      <Button
                        variant="default"
                        className="justify-start text-base font-medium"
                        asChild
                      >
                        <Link
                          href={`${process.env.NEXT_PUBLIC_APP_URL}/register`}
                        >
                          Register
                        </Link>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    className="justify-start text-base font-medium"
                    asChild
                  >
                    <Link
                      href="https://github.com/openpreview/openpreview"
                      target="_blank"
                    >
                      <Github className="mr-2 h-5 w-5" />
                      GitHub
                    </Link>
                  </Button>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>
    </header>
  );
}
