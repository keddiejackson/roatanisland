import Link from "next/link";

type EmptyStateProps = {
  title: string;
  text: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function EmptyState({
  title,
  text,
  primaryHref = "/map",
  primaryLabel = "Explore the map",
  secondaryHref = "/vendor/signup",
  secondaryLabel = "List your business",
}: EmptyStateProps) {
  return (
    <div className="brand-empty-state p-8 text-center">
      <p className="brand-eyebrow">
        Growing marketplace
      </p>
      <h2 className="mt-3 text-2xl font-black text-[#0B3C5D]">{title}</h2>
      <p className="brand-subtitle mx-auto mt-2 max-w-xl">{text}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={primaryHref}
          className="brand-button-primary"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="brand-button-secondary"
        >
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
