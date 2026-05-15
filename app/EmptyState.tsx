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
    <div className="rounded-2xl border border-dashed border-[#00A8A8]/35 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
        Growing marketplace
      </p>
      <h2 className="mt-3 text-2xl font-black text-[#0B3C5D]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl leading-7 text-gray-600">{text}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={primaryHref}
          className="rounded-xl bg-[#00A8A8] px-5 py-3 font-bold text-white"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="rounded-xl border border-[#00A8A8]/30 px-5 py-3 font-bold text-[#007B7B]"
        >
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
