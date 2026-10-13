"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthScreen({ initialMessage }: { initialMessage?: string } = {}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage(""); setError("");
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { data: { display_name: name.trim() || email.split("@")[0] } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("Account created. Check your email to confirm the account, then sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (signInError) throw signInError;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to authenticate. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="auth-brand"><div className="brand-mark">a.</div><div><div className="brand-name">ajaia</div><div className="brand-subtitle">WORKSPACE</div></div></div>
      <div className="auth-intro"><span className="auth-eyebrow">A CALMER WAY TO COLLABORATE</span><h1>{mode === "signin" ? "Welcome back." : "Make space for good work."}</h1><p>{mode === "signin" ? "Sign in to pick up where you left off." : "Create an account and start your workspace."}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && <label className="auth-label">Your name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarang Nair" maxLength={80}/></label>}
        <label className="auth-label">Email address<div className="auth-input-wrap"><Mail size={16}/><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/></div></label>
        <label className="auth-label">Password<div className="auth-input-wrap"><LockKeyhole size={16}/><input required type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"/></div></label>
        {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}
        <button className="auth-submit" disabled={busy} type="submit">{busy ? <LoaderCircle size={16} className="spin"/> : null}{mode === "signin" ? "Sign in" : "Create account"}<ArrowRight size={16}/></button>
      </form>
      <div className="auth-switch">{mode === "signin" ? "New to Ajaia?" : "Already have an account?"}<button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); setError(""); }}>{mode === "signin" ? "Create an account" : "Sign in"}</button></div>
      <p className="auth-footnote">Your documents stay private unless you choose to share them.</p>
    </section>
    <aside className="auth-quote"><div className="quote-mark">“</div><p>Good work happens when people have a little more room to think.</p><div className="quote-rule"/><span>AJAIA · A SHARED SPACE FOR IDEAS</span></aside>
  </main>;
}
