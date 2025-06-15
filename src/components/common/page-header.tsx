import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function PageHeader({ title, description, icon: Icon }: PageHeaderProps) {
  return (
    <div className="mb-12 text-center border-b pb-6 border-border animate-fade-in-up">
      <div className="flex justify-center items-center gap-3 mb-2">
        {Icon && <Icon className="h-10 w-10 text-primary transition-transform duration-300 hover:scale-110" />}
        <h1 className="text-4xl font-headline font-bold text-primary tracking-tight sm:text-5xl">
          {title}
        </h1>
      </div>
      {description && (
        <p className="mt-3 text-lg leading-7 text-muted-foreground max-w-2xl mx-auto" style={{ animationDelay: '0.2s' }}>
          {description}
        </p>
      )}
    </div>
  );
}
