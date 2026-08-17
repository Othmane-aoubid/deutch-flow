'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth'
import { Button, FormControl, Heading, Label, Link, Stack, Text, TextInput } from '@primer/react'
import { firebaseAuth, firebaseConfigured } from '@/lib/firebase'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseAuth) { setReady(true); return }
    return onAuthStateChanged(firebaseAuth, (nextUser) => { setUser(nextUser); setReady(true) })
  }, [])

  if (!firebaseConfigured) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 28 }}><Stack direction="vertical" gap="normal" style={{ maxWidth: 520 }}><Label variant="attention">Firebase setup required</Label><Heading as="h1" variant="large">Connect your Firebase project</Heading><Text style={{ color: 'var(--fgColor-muted)' }}>Add the NEXT_PUBLIC_FIREBASE_* web app variables in your project settings to enable sign in and account creation.</Text></Stack></main>

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      if (!firebaseAuth) throw new Error('Firebase is not configured.')
      if (registering) await createUserWithEmailAndPassword(firebaseAuth, email, password)
      else await signInWithEmailAndPassword(firebaseAuth, email, password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace('Firebase: ', '') : 'Unable to authenticate.')
    }
  }

  async function signInWithGoogle() {
    setError('')
    try {
      if (!firebaseAuth) throw new Error('Firebase is not configured.')
      const provider = new GoogleAuthProvider()
      await signInWithPopup(firebaseAuth, provider)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace('Firebase: ', '') : 'Unable to authenticate with Google.')
    }
  }

  if (!ready) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Text>Loading your learning space…</Text></main>
  if (user) return <>{children}</>

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 28 }}>
      <Stack direction="vertical" gap="spacious" style={{ width: '100%', maxWidth: 420 }}>
        <Stack direction="vertical" gap="condensed">
          <Label variant="accent">DeutschFlow</Label>
          <Heading as="h1" variant="large">Your learning space</Heading>
          <Text style={{ color: 'var(--fgColor-muted)' }}>
            {registering ? 'Create an account to save lessons and progress.' : 'Sign in to continue your German practice.'}
          </Text>
        </Stack>
        <form onSubmit={submit}>
          <Stack direction="vertical" gap="normal">
            <FormControl>
              <FormControl.Label>Email</FormControl.Label>
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </FormControl>
            <FormControl>
              <FormControl.Label>Password</FormControl.Label>
              <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
            </FormControl>
            {error && <Text style={{ color: 'var(--fgColor-danger)' }}>{error}</Text>}
            <Button variant="primary" type="submit">{registering ? 'Create account' : 'Sign in'}</Button>
          </Stack>
        </form>
        <Stack direction="vertical" gap="normal" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--borderColor-default)' }}></div>
            <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>or</Text>
            <div style={{ flex: 1, height: 1, background: 'var(--borderColor-default)' }}></div>
          </div>
          <Button variant="default" onClick={signInWithGoogle} style={{ width: '100%' }}>Sign in with Google</Button>
        </Stack>
        <Link as="button" onClick={() => setRegistering(!registering)}>
          {registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Link>
      </Stack>
    </main>
  )
}

export function SignOutButton() {
  return <Button onClick={() => { if (firebaseAuth) void signOut(firebaseAuth) }}>Sign out</Button>
}
