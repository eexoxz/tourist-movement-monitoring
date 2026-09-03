import type { ReactNode } from "react";

type PageProps = {
  title: string;
  eyebrow: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Page({ title, eyebrow, actions, children }: PageProps) {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
