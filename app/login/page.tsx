"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) setMessage(error.message);
      else setMessage("Check your email to confirm, then sign in.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage(error.message);
    else window.location.href = "/";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted-foreground mb-6 text-sm text-neutral-500">
        Saving exports to Supabase Storage requires an account. You can still use
        the editor and download files locally without signing in.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-border rounded-md border bg-white px-3 py-2 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
            required
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-border rounded-md border bg-white px-3 py-2 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm text-neutral-600 underline dark:text-neutral-400"
          >
            {mode === "signin" ? "Need an account?" : "Have an account?"}
          </button>
        </div>
      </form>
      {message && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
      )}
      <Link href="/" className="mt-8 text-sm text-neutral-500 underline">
        Back to editor
      </Link>
    </div>
  );
}
