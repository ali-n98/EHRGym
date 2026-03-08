import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import ehrgymIcon from "../../../ehrgym_icon.png";

type AppBrandProps = {
  title: string;
  subtitle: string;
  href?: Route;
  compact?: boolean;
};

export function AppBrand({ title, subtitle, href = "/", compact = false }: AppBrandProps) {
  const content = (
    <>
      <span className={compact ? "app-brand__logo app-brand__logo--compact" : "app-brand__logo"} aria-hidden="true">
        <Image src={ehrgymIcon} alt="" draggable={false} priority={compact ? false : true} />
      </span>
      <span className={compact ? "app-brand__copy app-brand__copy--compact" : "app-brand__copy"}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </span>
    </>
  );

  if (!href) {
    return <div className="app-brand">{content}</div>;
  }

  return (
    <Link href={href} className="app-brand" aria-label={title}>
      {content}
    </Link>
  );
}
