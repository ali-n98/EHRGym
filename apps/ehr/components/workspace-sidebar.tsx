import Link from "next/link";
import type { Route } from "next";
import type { ReactNode, SVGProps } from "react";

type SidebarIconName = "dashboard" | "patients" | "activity" | "snapshot" | "chart" | "summary" | "review" | "orders" | "notes";

type SidebarItem = {
  label: string;
  icon: SidebarIconName;
  active?: boolean;
  href?: string;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

type WorkspaceSidebarProps = {
  brand: ReactNode;
  sections: SidebarSection[];
  footerTitle: string;
  footerText: string;
  footerAction?: string;
  footerHref?: string;
};

function SidebarGlyph({ name, ...props }: { name: SidebarIconName } & SVGProps<SVGSVGElement>) {
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
          <rect x="3" y="3" width="5" height="5" rx="1" />
          <rect x="12" y="3" width="5" height="5" rx="1" />
          <rect x="3" y="12" width="5" height="5" rx="1" />
          <rect x="12" y="12" width="5" height="5" rx="1" />
        </svg>
      );
    case "patients":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...props}>
          <path d="M5 5.5h10" />
          <path d="M5 10h10" />
          <path d="M5 14.5h10" />
          <circle cx="3.5" cy="5.5" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="3.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="3.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M3 12h3l2-4 3.2 7 2.1-4H17" />
        </svg>
      );
    case "snapshot":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="3" y="4" width="14" height="12" rx="2" />
          <path d="M7 8h6" />
          <path d="M7 12h4" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M6 3.5h6l3 3V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z" />
          <path d="M12 3.5V7h3" />
        </svg>
      );
    case "summary":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...props}>
          <path d="M5 6h10" />
          <path d="M5 10h10" />
          <path d="M5 14h6" />
        </svg>
      );
    case "review":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <circle cx="9" cy="9" r="4.5" />
          <path d="m13 13 3.5 3.5" />
        </svg>
      );
    case "orders":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="5" y="3.5" width="10" height="13" rx="1.5" />
          <path d="M8 3.5h4" />
          <path d="M7.5 8h5" />
          <path d="M7.5 11h5" />
        </svg>
      );
    case "notes":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M6 3.5h8a1 1 0 0 1 1 1V16l-3-2-3 2-3-2-1 .7V4.5a1 1 0 0 1 1-1Z" />
          <path d="M7.5 8h5" />
          <path d="M7.5 10.8h5" />
        </svg>
      );
  }
}

export function WorkspaceSidebar({ brand, sections, footerTitle, footerText, footerAction, footerHref }: WorkspaceSidebarProps) {
  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar__brand">{brand}</div>

      <div className="workspace-sidebar__sections">
        {sections.map((section) => (
          <section key={section.title} className="workspace-sidebar__section">
            <p className="workspace-sidebar__heading">{section.title}</p>
            <div className="workspace-sidebar__nav">
              {section.items.map((item) => {
                const className = item.active ? "workspace-sidebar__item workspace-sidebar__item--active" : "workspace-sidebar__item";
                const content = (
                  <>
                    <span className="workspace-sidebar__icon" aria-hidden="true">
                      <SidebarGlyph name={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </>
                );

                if (item.href?.startsWith("#")) {
                  return (
                    <a key={item.label} href={item.href} className={className}>
                      {content}
                    </a>
                  );
                }

                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href as Route} className={className}>
                      {content}
                    </Link>
                  );
                }

                return (
                  <button key={item.label} type="button" className={className}>
                    {content}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="workspace-sidebar__footer">
        <strong>{footerTitle}</strong>
        <p>{footerText}</p>
        {footerAction
          ? footerHref?.startsWith("#")
            ? (
                <a href={footerHref} className="secondary-button workspace-sidebar__footer-action">
                  {footerAction}
                </a>
              )
            : footerHref
              ? (
                  <Link href={footerHref as Route} className="secondary-button workspace-sidebar__footer-action">
                    {footerAction}
                  </Link>
                )
              : (
                  <button type="button" className="secondary-button workspace-sidebar__footer-action">
                    {footerAction}
                  </button>
                )
          : null}
      </div>
    </aside>
  );
}
