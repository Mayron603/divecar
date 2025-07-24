
'use client';

import Link from 'next/link';
import { Shield, Home, Users, ScrollText, Info, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/common/theme-toggle';

const baseNavItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/hierarchy', label: 'Hierarquia', icon: Users },
  { href: '/history', label: 'História', icon: ScrollText },
  { href: '/about', label: 'Sobre Nós', icon: Info },
  { href: '/concurso', label: 'Concurso Público', icon: ClipboardList },
];

export function Navbar() {
  const navTextColor = "text-slate-100";
  const navIconColor = "text-slate-100/90 group-hover:text-white";
  const navButtonHover = "hover:bg-white/10";

  return (
    <header className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-3 group">
          <Shield className={`h-10 w-10 ${navTextColor} transition-transform duration-300 group-hover:scale-110`} />
          <span className={`text-xl md:text-2xl font-headline font-semibold ${navTextColor}`}>GCM Osasco</span>
        </Link>

        {/* Desktop Navbar */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {baseNavItems.map((item) => (
            <Button key={item.label} variant="ghost" asChild className={`${navTextColor} ${navButtonHover} transition-colors duration-300 px-2 lg:px-3 group`}>
              <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                <item.icon className={`h-5 w-5 ${navIconColor} transition-colors duration-300`} />
                {item.label}
              </Link>
            </Button>
          ))}
          <ThemeToggle />
        </nav>

        {/* Mobile Navbar Trigger */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle /> 
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`${navTextColor} ${navButtonHover}`}>
                <Menu className="h-7 w-7" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background text-foreground p-6 w-[250px] sm:w-[300px]">
              <div className="flex flex-col space-y-3 mt-6">
                {baseNavItems.map((item) => (
                  <Button key={`mobile-base-${item.label}`} variant="ghost" asChild className="text-foreground hover:bg-accent/10 hover:text-primary transition-colors duration-300 justify-start w-full text-left group">
                    <Link href={item.href} className="flex items-center gap-3 py-2.5 text-lg">
                      <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
