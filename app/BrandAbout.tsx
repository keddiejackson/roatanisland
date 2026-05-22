const trustPoints = [
  [
    "Local operators",
    "Browse listings shaped by the people offering the experience.",
  ],
  [
    "Map context",
    "Plan around beaches, ports, towns, and the airport before you request.",
  ],
  [
    "Flexible requests",
    "Share your date and group details before availability is confirmed.",
  ],
];

export default function BrandAbout() {
  return (
    <section className="bg-[#F7F3EA] px-5 pb-16 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 border-y border-[#D6B56D]/25 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-[#00A8A8]">
            Why it helps
          </p>
          <h2 className="mt-3 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
            Plan a Roatan day with a little more clarity.
          </h2>
          <p className="mt-4 max-w-xl leading-8 text-gray-600">
            See the experience, understand the area, and send a booking request
            with the details an operator needs to respond well.
          </p>
        </div>
        <div className="grid gap-0">
          {trustPoints.map(([title, text]) => (
            <div
              key={title}
              className="grid gap-2 border-t border-[#D6B56D]/20 py-5 first:border-t-0 sm:grid-cols-[180px_1fr] sm:gap-5"
            >
              <p className="font-black text-[#0B3C5D]">{title}</p>
              <p className="text-sm leading-6 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
