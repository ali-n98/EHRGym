"use client";

import { useEffect, useMemo, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  testId?: string;
};

type ActivityNavProps = {
  items: NavItem[];
  className?: string;
  defaultHref?: string;
  ariaLabel: string;
};

export function ActivityNav({ items, className, defaultHref, ariaLabel }: ActivityNavProps) {
  const fallbackHref = useMemo(() => defaultHref ?? items[0]?.href ?? "#summary", [defaultHref, items]);
  const [activeHref, setActiveHref] = useState(fallbackHref);

  useEffect(() => {
    const updateActiveHref = () => {
      const currentHash = window.location.hash || fallbackHref;
      setActiveHref(currentHash);
    };

    updateActiveHref();
    window.addEventListener("hashchange", updateActiveHref);
    return () => window.removeEventListener("hashchange", updateActiveHref);
  }, [fallbackHref]);

  return (
    <nav className={className} aria-label={ariaLabel}>
      {items.map((item) => (
        <a
          key={`${item.href}-${item.label}`}
          href={item.href}
          className={activeHref === item.href ? "nav-link is-active" : "nav-link"}
          aria-current={activeHref === item.href ? "page" : undefined}
          data-testid={item.testId}
          onClick={() => setActiveHref(item.href)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
