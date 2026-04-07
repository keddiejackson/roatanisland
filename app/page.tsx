export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4EBD0] text-[#1F2937]">

      {/* HERO */}
      <section className="text-center py-20 px-6">
        <h1 className="text-5xl font-bold text-[#0B3C5D]">
          Explore Roatán Like Never Before
        </h1>
        <p className="mt-4 text-lg text-gray-700">
          Book tours, hotels, and transportation all in one place.
        </p>
      </section>

      {/* FEATURED LISTING */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-[#0B3C5D]">
          Featured Experience
        </h2>

        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-xl font-semibold">
            Satisfaction Pirate Tours
          </h3>

          <p className="mt-3 text-gray-600">
            Step aboard the legendary Satisfaction and experience an interactive
            pirate adventure in the waters of French Harbour and French Cay.
          </p>

          <div className="mt-4 flex justify-between items-center">
            <span className="font-bold text-lg">$35 / person</span>

            <button className="bg-[#00A8A8] text-white px-4 py-2 rounded-lg">
              Book Now
            </button>
          </div>
        </div>
      </section>

    </main>
  );
}