'use client';

import Link from 'next/link';
import { Landmark, Home, Users, ScrollText, Info, Building, FolderSearch, AlertTriangle, UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
// import { useState, useEffect } from 'react';
// import { createSupabaseBrowserClient } from '@/lib/supabase/client';
// import type { User } from '@supabase/supabase-js';
// import { useRouter } from 'next/navigation';

const baseNavItems = [
  { href: '/', label: 'Início', icon: <Home className="h-5 w-5" /> },
  { href: '/hierarchy', label: 'Hierarquia', icon: <Users className="h-5 w-5" /> },
  { href: '/history', label: 'História', icon: <ScrollText className="h-5 w-5" /> },
  { href: '/about', label: 'Sobre Nós', icon: <Info className="h-5 w-5" /> },
  { href: '/investigations', label: 'Investigações', icon: <FolderSearch className="h-5 w-5" /> },
  { href: '/suspicious-vehicles', label: 'Veíc. Suspeitos', icon: <AlertTriangle className="h-5 w-5" /> },
];

const authNavItems = [
  { href: '/login', label: 'Login', icon: <LogIn className="h-5 w-5" /> },
  { href: '/register', label: 'Registrar', icon: <UserPlus className="h-5 w-5" /> },
];


export function Navbar() {
  // const router = useRouter();
  // const [user, setUser] = useState<User | null>(null);
  // const [isLoading, setIsLoading] = useState(true);
  // const supabase = createSupabaseBrowserClient();

  // useEffect(() => {
  //   const getSession = async () => {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     setUser(session?.user ?? null);
  //     setIsLoading(false);
  //   };
  //   getSession();

  //   const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  //     setUser(session?.user ?? null);
  //     if (event === 'SIGNED_OUT') {
  //       router.refresh(); // Forçar atualização para limpar o cache do lado do servidor da sessão
  //     }
  //   });

  //   return () => {
  //     authListener?.subscription.unsubscribe();
  //   };
  // }, [supabase, router]);

  // const handleLogout = async () => {
  //   await supabase.auth.signOut();
  //   router.push('/'); // Redirecionar para a página inicial após o logout
  // };

  const allNavItems = [...baseNavItems, ...authNavItems];


  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-3">
          <Building className="h-10 w-10 text-accent" />
          <span className="text-xl md:text-2xl font-headline font-semibold">DIVECAR Osasco</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {allNavItems.map((item) => (
            <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 px-2 lg:px-3">
              <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                {item.icon}
                {item.label}
              </Link>
            </Button>
          ))}
           {/* {isLoading ? (
            <div className="h-8 w-20 bg-primary/50 animate-pulse rounded-md"></div>
          ) : user ? (
            <>
              <span className="text-xs lg:text-sm px-2 lg:px-3 hidden sm:block truncate max-w-[100px] lg:max-w-[150px]" title={user.email}>
                {user.email}
              </span>
              <Button onClick={handleLogout} variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 px-2 lg:px-3 text-xs lg:text-sm">
                <LogOut className="h-5 w-5 mr-1 sm:mr-2" /> Sair
              </Button>
            </>
          ) : (
            authNavItems.map((item) => (
              <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 px-2 lg:px-3">
                <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            ))
          )} */}
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent">
                <Menu className="h-7 w-7" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-primary text-primary-foreground p-6 w-[250px]">
              <div className="flex flex-col space-y-4 mt-6">
                {allNavItems.map((item) => (
                  <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 justify-start w-full">
                    <Link href={item.href} className="flex items-center gap-3 py-2 text-lg">
                      {item.icon}
                      {item.label}
                    </Link>
                  </Button>
                ))}
                {/* {isLoading ? (
                   <div className="h-10 w-full bg-primary/50 animate-pulse rounded-md"></div>
                ) : user ? (
                  <>
                    <span className="text-lg px-3 py-2 text-left truncate" title={user.email}>
                      {user.email}
                    </span>
                    <Button onClick={handleLogout} variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 justify-start w-full flex items-center gap-3 py-2 text-lg">
                      <LogOut className="h-5 w-5" /> Sair
                    </Button>
                  </>
                ) : (
                  authNavItems.map((item) => (
                    <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 justify-start w-full">
                      <Link href={item.href} className="flex items-center gap-3 py-2 text-lg">
                        {item.icon}
                        {item.label}
                      </Link>
                    </Button>
                  ))
                )} */}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}