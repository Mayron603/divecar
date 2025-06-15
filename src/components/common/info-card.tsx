
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface InfoCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  linkText?: string;
}

export function InfoCard({ title, description, href, icon: Icon, linkText = "Saiba Mais" }: InfoCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col h-full group hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <div className="bg-accent p-3 rounded-full">
          <Icon className="h-6 w-6 text-accent-foreground" />
        </div>
        <CardTitle className="text-xl font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <CardDescription className="text-base text-muted-foreground mb-4 flex-grow">{description}</CardDescription>
        <Button asChild variant="default" className="mt-auto bg-primary hover:bg-primary/90 text-primary-foreground w-full group-hover:scale-105 transition-transform duration-300 ease-in-out">
          <Link href={href}>
            {linkText}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
