export default function RootLoading() {
  return (
    <main className="brand-page min-h-dvh px-4 py-6 sm:px-6 sm:py-10" aria-busy="true">
      <div className="mx-auto max-w-6xl">
        <div className="brand-skeleton h-16 w-52" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="brand-skeleton h-[28rem]" />
          <div className="grid gap-4">
            <div className="brand-skeleton h-32" />
            <div className="brand-skeleton h-32" />
            <div className="brand-skeleton h-32" />
          </div>
        </div>
        <span className="sr-only">Loading Roatan Island Life</span>
      </div>
    </main>
  );
}

