import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  testId?: string;
  className?: string;
};

export function SectionCard({ title, subtitle, children, testId, className }: SectionCardProps) {
  return (
    <section className={["section-card", className].filter(Boolean).join(" ")} data-testid={testId}>
      <div className="section-card__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
