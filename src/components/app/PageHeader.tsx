import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex min-w-0 flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">Bombay Suiting & Shirting</div>
        <h1 className="break-words text-3xl font-semibold text-primary sm:text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 break-words text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="glass-card relative min-w-0 overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5 sm:p-5">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gold-gradient" />
      <div className="break-words text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="num mt-2 break-words font-display text-2xl font-semibold text-primary sm:text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Panel({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="glass-card min-w-0 overflow-hidden rounded-2xl p-4 sm:p-6">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h3 className="text-2xl font-semibold text-primary">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
