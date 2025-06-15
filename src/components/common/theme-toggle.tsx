
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

  // Navbar tem fundo escuro consistente, então os ícones do toggle devem ser sempre claros.
  const buttonClasses = "text-slate-100 hover:bg-white/20 group"; // Efeito hover sutil sobre fundo escuro
  const iconClasses = "h-5 w-5 text-slate-100 group-hover:text-white transition-all";


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={buttonClasses}>
          {/* O ícone (Sol/Lua) exibido depende do tema do CORPO da página, mas sua COR é sempre clara */}
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
    
