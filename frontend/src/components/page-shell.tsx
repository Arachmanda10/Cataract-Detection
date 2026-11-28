import { AppNav } from "@/components/app-nav";

export function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <AppNav />
      <main className="mt-8 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
        {children}
      </main>
    </div>
  );
}