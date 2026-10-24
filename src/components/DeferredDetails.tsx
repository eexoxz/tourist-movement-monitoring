import { useState, type ReactNode } from "react";

export function DeferredDetails({ summary, children, className, id, initiallyOpen = false }: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  initiallyOpen?: boolean;
}) {
  const [opened, setOpened] = useState(initiallyOpen);
  return <details className={className} id={id} open={initiallyOpen || undefined} onToggle={(event) => {
    if (event.target === event.currentTarget && event.currentTarget.open) setOpened(true);
  }}>
    <summary>{summary}</summary>
    {opened && children}
  </details>;
}
