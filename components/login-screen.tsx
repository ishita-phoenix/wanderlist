"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAccount, registerAccount } from "@/lib/api"
import type { AuthSession } from "@/lib/auth-session"

type LoginScreenProps = {
  onLoggedIn: (session: AuthSession) => void
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (isRegister) {
        const data = await registerAccount({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        })
        onLoggedIn({
          userId: data.userId,
          email: data.email,
          name: data.name,
          token: data.token,
        })
      } else {
        const data = await loginAccount({ email: email.trim(), password })
        onLoggedIn({
          userId: data.userId,
          email: data.email,
          name: data.name,
          token: data.token,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md relative bg-card rounded-sm shadow-xl border-2 border-border overflow-hidden p-8 md:p-10">
        <div className="absolute -top-2 left-8 w-16 h-6 bg-accent/40 transform -rotate-2 z-10" />
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-md">
            <MapPin className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-[family-name:var(--font-cursive)] text-3xl text-primary text-center">
            Wanderlist
          </h1>
          <p className="text-sm text-muted-foreground text-center font-[family-name:var(--font-sans)]">
            Sign in so your trips save to your account on the server — same login works across devices.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name" className="font-[family-name:var(--font-handwritten)] text-lg">
                Display name
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                className="border-2 rounded-sm"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="font-[family-name:var(--font-handwritten)] text-lg">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="border-2 rounded-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-[family-name:var(--font-handwritten)] text-lg">
              Password {isRegister && <span className="text-muted-foreground text-xs">(min 8 characters)</span>}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-2 rounded-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-[family-name:var(--font-sans)] bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-sm py-6 text-lg font-[family-name:var(--font-sans)]"
          >
            {pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground font-[family-name:var(--font-sans)]">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline font-medium"
            onClick={() => {
              setIsRegister(!isRegister)
              setError(null)
            }}
          >
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </div>
    </main>
  )
}
