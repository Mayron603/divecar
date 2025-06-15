
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

  // Adjusted classes for better contrast on new navbar backgrounds
  const toggleButtonTextColor = "text-primary dark:text-slate-100";
  const toggleButtonHoverBg = "hover:bg-black/10 dark:hover:bg-white/20";
  const iconColor = "text-primary dark:text-slate-100";
  const iconHoverColor = "group-hover:text-primary dark:group-hover:text-slate-50";


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`${toggleButtonTextColor} ${toggleButtonHoverBg} group`}>
          {resolvedTheme === 'dark' ? (
            <Moon className={`h-5 w-5 ${iconColor} transition-all ${iconHoverColor}`} />
          ) : (
            <Sun className={`h-5 w-5 ${iconColor} transition-all ${iconHoverColor}`} />
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

    