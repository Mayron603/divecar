
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

  // Light theme (dark blue-gray navbar): icons are light (slate-100)
  // Dark theme (white navbar): icons are dark (blue-700 or similar)
  const buttonClasses = "text-slate-100 dark:text-blue-700 hover:bg-slate-700/80 dark:hover:bg-black/10 group";
  const iconClasses = "h-5 w-5 text-slate-100 dark:text-blue-700 group-hover:text-slate-50 dark:group-hover:text-blue-800 transition-all";


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
    
