"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (attempts >= 3) {
      setError("Too many attempts. Refresh the page and try again.");
      return;
    }

    if (username === "admin" && password === "pirate123") {
      localStorage.setItem("admin", "true");
      router.push("/admin/bookings");
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setError(`Incorrect login (${nextAttempts}/3)`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F4EBD0] px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-[#0B3C5D]">Admin Login</h1>
        <p className="mt-2 text-gray-600">
          Sign in to view booking requests.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}