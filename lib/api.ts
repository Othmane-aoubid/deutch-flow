'use client'

import { firebaseAuth } from '@/lib/firebase'

/**
 * Client fetch helper that attaches the current user's Firebase ID token.
 * Pass `auth: false` to skip the token.
 */
export async function apiFetch(input: string, init: RequestInit = {}, options: { auth?: boolean } = {}) {
  const token = options.auth === false ? null : await firebaseAuth?.currentUser?.getIdToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
