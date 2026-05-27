import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
}

export function StatCard({ title, value, icon, subtitle, className }: StatCardProps) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="shrink-0">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
