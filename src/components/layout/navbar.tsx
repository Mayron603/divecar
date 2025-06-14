
'use client';

import Link from 'next/link';
import { Building, Home, Users, ScrollText, Info, FolderSearch, AlertTriangle, UserPlus, LogIn, LogOut, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { signOutUser } from '@/lib/actions/auth.actions'; // Importar server action
import type { User } from '@supabase/supabase-js'; // Importar tipo User
import { usePathname, useRouter } from 'next/navigation'; // useRouter para refresh
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';


const baseNavItems = [
  { href: '/', label: 'Início', icon: <Home className="h-5 w-5" /> },
  { href: '/hierarchy', label: 'Hierarquia', icon: <Users className="h-5 w-5" /> },
  { href: '/history', label: 'História', icon: <ScrollText className="h-5 w-5" /> },
  { href: '/about', label: 'Sobre Nós', icon: <Info className="h-5 w-5" /> },
  { href: '/investigations', label: 'Investigações', icon: <FolderSearch className="h-5 w-5" /> },
  { href: '/suspicious-vehicles', label: 'Veíc. Suspeitos', icon: <AlertTriangle className="h-5 w-5" /> },
];

// Itens que aparecem quando o usuário NÃO está logado
const unauthenticatedNavItems = [
  { href: '/login', label: 'Login', icon: <LogIn className="h-5 w-5" /> },
  { href: '/register', label: 'Registrar', icon: <UserPlus className="h-5 w-5" /> },
];


export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && pathname === '/login') {
        router.push('/');
      }
      if (event === 'SIGNED_OUT') {
         // router.push('/'); // Redireciona para home no logout
         router.refresh(); // Garante que o estado do servidor seja atualizado
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  const handleLogout = async () => {
    await signOutUser(); // Chama a server action
    // O redirecionamento é feito na server action e router.refresh() no onAuthStateChange
  };
  
  const navItemsToDisplay = user ? baseNavItems : [...baseNavItems, ...unauthenticatedNavItems];


  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-3">
          <Building className="h-10 w-10 text-accent" />
          <span className="text-xl md:text-2xl font-headline font-semibold">DIVECAR Osasco</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navItemsToDisplay.map((item) => (
            <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 px-2 lg:px-3">
              <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                {item.icon}
                {item.label}
              </Link>
            </Button>
          ))}
           {isLoading ? (
            <div className="h-8 w-24 bg-primary/50 animate-pulse rounded-md"></div> // Placeholder maior
           ) : user ? (
            <>
              <span className="text-xs lg:text-sm px-2 lg:px-3 flex items-center" title={user.email}>
                <UserCircle2 className="h-5 w-5 mr-1.5 text-accent" /> 
                <span className="truncate max-w-[100px] lg:max-w-[150px]">{user.email}</span>
              </span>
              <form action={handleLogout}>
                <Button type="submit" variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 px-2 lg:px-3 text-xs lg:text-sm">
                  <LogOut className="h-5 w-5 mr-1 sm:mr-2" /> Sair
                </Button>
              </form>
            </>
          ) : (
            <>
            {/* Links de login/registro já estão em navItemsToDisplay se user for null */}
            </>
          )}
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent">
                <Menu className="h-7 w-7" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-primary text-primary-foreground p-6 w-[250px] sm:w-[300px]">
              <div className="flex flex-col space-y-3 mt-6">
                {navItemsToDisplay.map((item) => (
                  <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 justify-start w-full text-left">
                    <Link href={item.href} className="flex items-center gap-3 py-2.5 text-lg">
                      {item.icon}
                      {item.label}
                    </Link>
                  </Button>
                ))}
                {isLoading ? (
                   <div className="h-12 w-full bg-primary/50 animate-pulse rounded-md mt-2"></div>
                ) : user ? (
                  <>
                    <div className="px-3 py-2.5 text-lg text-left truncate flex items-center border-t border-primary-foreground/20 mt-3 pt-4" title={user.email}>
                       <UserCircle2 className="h-6 w-6 mr-2.5 text-accent" /> 
                       {user.email}
                    </div>
                    <form action={handleLogout} className="w-full">
                      <Button type="submit" variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 justify-start w-full flex items-center gap-3 py-2.5 text-lg">
                        <LogOut className="h-5 w-5" /> Sair
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                  {/* Links de login/registro já estão em navItemsToDisplay se user for null */}
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

