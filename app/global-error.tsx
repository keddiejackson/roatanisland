"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 640, margin: "12vh auto", padding: 24, fontFamily: "system-ui" }}>
          <h1>Roatan Island Life needs a quick refresh.</h1>
          <p>Your saved plans have not been removed.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "10px 18px" }}>
            Reload the experience
          </button>
        </main>
      </body>
    </html>
  );
}

