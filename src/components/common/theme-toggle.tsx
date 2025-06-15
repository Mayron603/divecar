
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Navbar light theme: dark blue bg, so icons are light (primary-foreground)
  // Navbar dark theme: white/light-gray bg, so icons are dark (e.g., blue-700)
  const buttonClasses = "text-primary-foreground dark:text-blue-700 hover:bg-white/20 dark:hover:bg-black/10 group";
  const iconClasses = "h-5 w-5 text-primary-foreground dark:text-blue-700 group-hover:text-primary-foreground dark:group-hover:text-blue-800 transition-all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={buttonClasses}>
          {resolvedTheme === 'dark' ? (
            <Moon className={iconClasses} />
          ) : (
            <Sun className={iconClasses} />
          )}
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-accent text-accent-foreground' : ''}>
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-accent text-accent-foreground' : ''}>
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'bg-accent text-accent-foreground' : ''}>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    