'use client';

import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@openpreview/ui/components/sheet';

export function MobileSidebar({ children }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed left-4 top-4 z-50 md:hidden">
          <Menu className="text-foreground h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        {children}
      </SheetContent>
    </Sheet>
  );
}