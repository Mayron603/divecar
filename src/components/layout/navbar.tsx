
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
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/common/theme-toggle';

const baseNavItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/hierarchy', label: 'Hierarquia', icon: Users },
  { href: '/history', label: 'História', icon: ScrollText },
  { href: '/about', label: 'Sobre Nós', icon: Info },
  { href: '/investigations', label: 'Investigações', icon: FolderSearch },
  { href: '/suspicious-vehicles', label: 'Veíc. Suspeitos', icon: AlertTriangle },
];

const unauthenticatedNavItems = [
  { href: '/login', label: 'Login', icon: LogIn },
  { href: '/register', label: 'Registrar', icon: UserPlus },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  useEffect(() => {
    console.log('[Navbar] useEffect: V_RELOAD_FIX_HANDLE_SIGNOUT_FORCE_RELOAD Initializing session check and auth listener.');
    const getSession = async () => {
      setIsLoading(true);
      console.log('[Navbar] useEffect/getSession: Attempting to get session.');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[Navbar] Error getting session:', sessionError.message);
        }
        const initialUser = session?.user ?? null;
        console.log('[Navbar] useEffect/getSession: Session fetched. User in session:', initialUser?.email ?? 'No user in session');
        setUser(initialUser);
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
      const currentUser = session?.user ?? null;
      console.log(`[Navbar] onAuthStateChange V_RELOAD_FIX_HANDLE_SIGNOUT_FORCE_RELOAD event: ${event}. Current user email: ${currentUser?.email ?? 'No user'}.`);
      
      setUser(currentUser); 
      setIsLoading(false); 

      if (event === 'SIGNED_IN' && (pathname === '/login' || pathname === '/register')) {
        console.log('[Navbar] SIGNED_IN event detected on login/register page, redirecting to /');
        router.push('/');
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[Navbar] SIGNED_OUT event detected by onAuthStateChange. V_RELOAD_FIX_HANDLE_SIGNOUT_FORCE_RELOAD_CLICK. Setting user to null and reloading.');
        setUser(null); 
        window.location.reload();
      }
    });

    return () => {
      console.log('[Navbar] Unsubscribing from auth listener.');
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  const handleSignOut = async () => {
    console.log('[Navbar] handleSignOut: V_RELOAD_FIX_HANDLE_SIGNOUT_FORCE_RELOAD_CLICK Iniciando logout...');
    setIsLoading(true);
    try {
      await signOutUser();
      setUser(null); 
      console.log('[Navbar] handleSignOut: signOutUser (Server Action) completou e user set to null.');
      window.location.reload(); 
    } catch (error) {
      console.error('[Navbar] handleSignOut: Erro durante o processo de logout:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Sair',
        description: 'Não foi possível completar o logout. Tente novamente.',
      });
      setIsLoading(false); 
    }
  };


  const avatarUrl = user?.user_metadata?.avatar_url;
  const userEmail = user?.email;

  // Define text and icon colors based on theme for readability against Navbar background
  const navTextColorLight = "text-slate-100"; // Light text for dark blue-gray Navbar
  const navIconColorLight = "text-slate-100/80 group-hover:text-slate-50"; // Lighter icons
  
  const navTextColorDark = "text-blue-800"; // Dark text for white Navbar
  const navIconColorDark = "text-blue-800/80 group-hover:text-blue-800"; // Darker icons

  const navButtonHoverLight = "hover:bg-slate-700/80"; // Darker hover for light text
  const navButtonHoverDark = "hover:bg-black/5"; // Lighter hover for dark text

  const UserProfileDisplay = () => {
    if (isLoading) {
      return <div className={`h-10 w-32 bg-slate-500/50 dark:bg-slate-300/50 animate-pulse rounded-md`}></div>;
    }
    if (!user) {
      return (
        <>
          {unauthenticatedNavItems.map((item) => (
            <Button key={item.label} variant="ghost" asChild className={`${navTextColorLight} dark:${navTextColorDark} ${navButtonHoverLight} dark:${navButtonHoverDark} transition-colors duration-300 px-2 lg:px-3 group`}>
              <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                <item.icon className={`h-5 w-5 ${navIconColorLight} dark:${navIconColorDark} transition-colors duration-300`} />
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
          <Button variant="ghost" className={`relative h-10 w-10 rounded-full p-0 ${navButtonHoverLight} dark:${navButtonHoverDark} transition-all duration-300 hover:scale-110`}>
            <Avatar className="h-9 w-9 border-2 border-accent">
              <AvatarImage src={avatarUrl} alt={userEmail || 'User avatar'} />
              <AvatarFallback className="bg-primary/80 dark:bg-slate-200 text-accent dark:text-primary text-lg">
                 <UserCircle2 className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive hover:!text-destructive hover:!bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
  return (
    <header className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 dark:bg-gradient-to-r dark:from-slate-100 dark:via-white dark:to-slate-200 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-3 group">
          <Building className={`h-10 w-10 ${navTextColorLight} dark:${navTextColorDark} transition-transform duration-300 group-hover:scale-110`} />
          <span className={`text-xl md:text-2xl font-headline font-semibold ${navTextColorLight} dark:${navTextColorDark}`}>DIVECAR Osasco</span>
        </Link>

        {/* Desktop Navbar */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {baseNavItems.map((item) => (
            <Button key={item.label} variant="ghost" asChild className={`${navTextColorLight} dark:${navTextColorDark} ${navButtonHoverLight} dark:${navButtonHoverDark} transition-colors duration-300 px-2 lg:px-3 group`}>
              <Link href={item.href} className="flex items-center gap-2 text-xs lg:text-sm">
                <item.icon className={`h-5 w-5 ${navIconColorLight} dark:${navIconColorDark} transition-colors duration-300`} />
                {item.label}
              </Link>
            </Button>
          ))}
          <UserProfileDisplay />
          <ThemeToggle />
        </nav>

        {/* Mobile Navbar Trigger */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle /> 
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`${navTextColorLight} dark:${navTextColorDark} ${navButtonHoverLight} dark:${navButtonHoverDark}`}>
                <Menu className="h-7 w-7" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background text-foreground p-6 w-[250px] sm:w-[300px]"> {/* Mobile sheet uses standard card/popover bg */}
              <div className="flex flex-col space-y-3 mt-6">
                {baseNavItems.map((item) => (
                  <Button key={`mobile-base-${item.label}`} variant="ghost" asChild className="text-foreground hover:bg-accent/10 hover:text-primary transition-colors duration-300 justify-start w-full text-left group">
                    <Link href={item.href} className="flex items-center gap-3 py-2.5 text-lg">
                      <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                      {item.label}
                    </Link>
                  </Button>
                ))}

                <hr className="border-border my-2" />

                {isLoading ? (
                   <div className="h-12 w-full bg-muted/50 animate-pulse rounded-md mt-2"></div>
                ) : user ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="justify-start w-full text-left flex items-center gap-3 py-2.5 text-lg h-auto px-3 hover:bg-accent/10 hover:text-primary group text-foreground">
                           <Avatar className="h-8 w-8 border-2 border-accent transition-transform duration-300 group-hover:scale-105">
                            <AvatarImage src={avatarUrl} alt={userEmail || 'User avatar'} />
                            <AvatarFallback className="bg-primary text-accent">
                               <UserCircle2 className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{user?.user_metadata?.full_name || userEmail || 'Perfil'}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 bg-popover border-border text-popover-foreground" align="end" sideOffset={10}>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none text-foreground">
                              {user?.user_metadata?.full_name || 'Usuário'}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {userEmail}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border" />
                         <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive hover:!text-destructive hover:!bg-destructive/10">
                              <LogOut className="mr-2 h-4 w-4" />
                              Sair
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  unauthenticatedNavItems.map((item) => (
                    <Button key={`mobile-auth-${item.label}`} variant="ghost" asChild className="text-foreground hover:bg-accent/10 hover:text-primary transition-colors duration-300 justify-start w-full text-left group">
                      <Link href={item.href} className="flex items-center gap-3 py-2.5 text-lg">
                        <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
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
    
