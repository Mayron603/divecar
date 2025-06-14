
'use client';

import Link from 'next/link';
import { Building, Home, Users, ScrollText, Info, FolderSearch, AlertTriangle, UserPlus, LogIn, LogOut, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { signOutUser } from '@/lib/actions/auth.actions';
import type { User } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const baseNavItems = [
  { href: '/', label: 'Início', icon: <Home className="h-5 w-5" /> },
  { href: '/hierarchy', label: 'Hierarquia', icon: <Users className="h-5 w-5" /> },
  { href: '/history', label: 'História', icon: <ScrollText className="h-5 w-5" /> },
  { href: '/about', label: 'Sobre Nós', icon: <Info className="h-5 w-5" /> },
  { href: '/investigations', label: 'Investigações', icon: <FolderSearch className="h-5 w-5" /> },
  { href: '/suspicious-vehicles', label: 'Veíc. Suspeitos', icon: <AlertTriangle className="h-5 w-5" /> },
];

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
    console.log('[Navbar] useEffect: Initializing session check and auth listener.');
    const getSession = async () => {
      setIsLoading(true);
      console.log('[Navbar] useEffect/getSession: Attempting to get session.');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[Navbar] Error getting session:', sessionError.message);
        }
        console.log('[Navbar] useEffect/getSession: Session fetched. User in session:', session?.user?.email ?? 'No user in session');
        console.log('[Navbar] Full user object from getSession:', JSON.stringify(session?.user, null, 2));
        console.log('[Navbar] User metadata from getSession:', JSON.stringify(session?.user?.user_metadata, null, 2));
        setUser(session?.user ?? null);
      } catch (e) {
        console.error('[Navbar] Exception during getSession:', e);
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log('[Navbar] useEffect/getSession: Loading state set to false.');
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Navbar] onAuthStateChange event:', event, 'User in session:', session?.user?.email ?? 'No user');
      console.log('[Navbar] Full user object from onAuthStateChange:', JSON.stringify(session?.user, null, 2));
      console.log('[Navbar] User metadata from onAuthStateChange:', JSON.stringify(session?.user?.user_metadata, null, 2));
      setUser(session?.user ?? null);
      setIsLoading(false); 

      if (event === 'SIGNED_IN' && (pathname === '/login' || pathname === '/register')) {
        console.log('[Navbar] SIGNED_IN event detected on login/register page, redirecting to /');
        router.push('/');
        router.refresh(); 
      }
      if (event === 'SIGNED_OUT') {
        console.log('[Navbar] SIGNED_OUT event detected. Refreshing router.');
        router.push('/'); 
        router.refresh();
      }
    });

    return () => {
      console.log('[Navbar] Unsubscribing from auth listener.');
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userEmail = user?.email;
  const userNameOrInitial = userEmail ? (user?.user_metadata?.full_name || userEmail.charAt(0).toUpperCase()) : "U";

  const UserProfileDisplay = () => {
    if (isLoading) {
      return <div className="h-8 w-32 bg-primary/50 animate-pulse rounded-md"></div>;
    }
    if (!user) {
      return (
        <>
          {unauthenticatedNavItems.map((item) => (
            <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 px-2 lg:px-3">
              <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                {item.icon}
                {item.label}
              </Link>
            </Button>
          ))}
        </>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-primary/80">
            <Avatar className="h-9 w-9 border-2 border-accent">
              <AvatarImage src={avatarUrl} alt={userEmail || 'User avatar'} />
              <AvatarFallback className="bg-primary text-accent text-lg">
                {avatarUrl ? null : <UserCircle2 className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <form action={signOutUser} className="w-full">
            <DropdownMenuItem asChild>
               <Button type="submit" variant="ghost" className="w-full justify-start cursor-pointer h-auto py-1.5 px-2">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };


  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-3">
          <Building className="h-10 w-10 text-accent" />
          <span className="text-xl md:text-2xl font-headline font-semibold">DIVECAR Osasco</span>
        </Link>

        {/* Desktop Navbar */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {baseNavItems.map((item) => (
            <Button key={item.label} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 px-2 lg:px-3">
              <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                {item.icon}
                {item.label}
              </Link>
            </Button>
          ))}
          <UserProfileDisplay />
        </nav>

        {/* Mobile Navbar Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent">
                <Menu className="h-7 w-7" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-primary text-primary-foreground p-6 w-[250px] sm:w-[300px]">
              <div className="flex flex-col space-y-3 mt-6">
                {baseNavItems.map((item) => (
                  <Button key={`mobile-base-${item.label}`} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 justify-start w-full text-left">
                    <Link href={item.href} className="flex items-center gap-3 py-2.5 text-lg">
                      {item.icon}
                      {item.label}
                    </Link>
                  </Button>
                ))}

                <hr className="border-primary-foreground/20 my-2" />

                {isLoading ? (
                   <div className="h-12 w-full bg-primary/50 animate-pulse rounded-md mt-2"></div>
                ) : user ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="justify-start w-full text-left flex items-center gap-3 py-2.5 text-lg h-auto px-3 hover:bg-primary/80">
                           <Avatar className="h-8 w-8 border-2 border-accent">
                            <AvatarImage src={avatarUrl} alt={userEmail || 'User avatar'} />
                            <AvatarFallback className="bg-primary text-accent">
                               {avatarUrl ? null : <UserCircle2 className="h-5 w-5" />}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{user?.user_metadata?.full_name || userEmail || 'Perfil'}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 bg-primary border-primary-foreground/20 text-primary-foreground" align="end" sideOffset={10}>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {user?.user_metadata?.full_name || 'Usuário'}
                            </p>
                            <p className="text-xs leading-none text-primary-foreground/80">
                              {userEmail}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-primary-foreground/20" />
                        <form action={signOutUser} className="w-full">
                          <DropdownMenuItem asChild>
                             <Button type="submit" variant="ghost" className="w-full justify-start cursor-pointer h-auto py-1.5 px-2 text-primary-foreground hover:bg-primary/90 hover:text-accent">
                              <LogOut className="mr-2 h-4 w-4" />
                              Sair
                            </Button>
                          </DropdownMenuItem>
                        </form>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  unauthenticatedNavItems.map((item) => (
                    <Button key={`mobile-auth-${item.label}`} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80 hover:text-accent transition-colors duration-300 justify-start w-full text-left">
                      <Link href={item.href} className="flex items-center gap-3 py-2.5 text-lg">
                        {item.icon}
                        {item.label}
                      </Link>
                    </Button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
    
