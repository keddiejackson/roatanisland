export type BrandAboutTrustPoint = {
  title: string;
  text: string;
};

type BrandAboutProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  trustPoints?: BrandAboutTrustPoint[];
};

const defaultTrustPoints: BrandAboutTrustPoint[] = [
  {
    title: "Local operators",
    text: "Browse listings shaped by the people offering the experience.",
  },
  {
    title: "Map context",
    text: "Plan around beaches, ports, towns, and the airport before you request.",
  },
  {
    title: "Flexible requests",
    text: "Share your date and group details before availability is confirmed.",
  },
];

export default function BrandAbout({
  eyebrow = "Why it helps",
  title = "Plan a Roatan day with a little more clarity.",
  body = "See the experience, understand the area, and send a booking request with the details an operator needs to respond well.",
  trustPoints = defaultTrustPoints,
}: BrandAboutProps) {
  const visibleTrustPoints = trustPoints.filter(
    (point) => point.title.trim() && point.text.trim(),
  );

  return (
    <section className="bg-[#F7F3EA] px-5 pb-16 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 border-y border-[#D6B56D]/25 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-[#00A8A8]">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-xl leading-8 text-gray-600">
            {body}
          </p>
        </div>
        {visibleTrustPoints.length > 0 ? (
        <div className="grid gap-0">
          {visibleTrustPoints.map((point) => (
            <div
              key={point.title}
              className="grid gap-2 border-t border-[#D6B56D]/20 py-5 first:border-t-0 sm:grid-cols-[180px_1fr] sm:gap-5"
            >
              <p className="font-black text-[#0B3C5D]">{point.title}</p>
              <p className="text-sm leading-6 text-gray-600">{point.text}</p>
            </div>
          ))}
        </div>
        ) : null}
      </div>
    </section>
  );
}
