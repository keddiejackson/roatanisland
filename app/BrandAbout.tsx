const trustPoints = [
  ["Local inventory", "Operators can manage their own listings, photos, times, and profile details."],
  ["Planning context", "Travelers can compare options around ports, beaches, towns, and the airport."],
  ["Human confirmation", "Booking requests stay flexible until an operator reviews availability."],
];

export default function BrandAbout() {
  return (
    <section className="bg-[#F7F3EA] px-5 py-16 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#00A8A8]">
            About RoatanIsland.life
          </p>
          <h2 className="mt-3 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
            A cleaner way to connect Roatan visitors with local operators.
          </h2>
          <p className="mt-4 max-w-xl leading-8 text-gray-600">
            The site is built to feel simple for travelers and practical for
            vendors: clear listings, map-first planning, controlled privacy, and
            booking requests that leave room for real availability checks.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          {trustPoints.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-[#D6B56D]/20 bg-white p-5 shadow-sm"
            >
              <p className="font-black text-[#0B3C5D]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
