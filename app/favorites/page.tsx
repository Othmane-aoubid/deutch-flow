'use client'

import { useState, useEffect } from 'react'
import { Button, Heading, Label, Stack, Text } from '@primer/react'
import { ArrowLeftIcon, HeartIcon, HeartFillIcon, PlayIcon, TrashIcon } from '@primer/octicons-react'
import { useRouter } from 'next/navigation'
import { firebaseAuth } from '@/lib/firebase'

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      if (!firebaseAuth) {
        setError('Firebase not configured')
        setLoading(false)
        return
      }
      const user = firebaseAuth.currentUser
      if (!user) {
        setError('Please sign in to view favorites')
        setLoading(false)
        return
      }
      const token = await user.getIdToken()
      const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` }
      const response = await fetch('/api/favorites', { headers })
      
      if (!response.ok) {
        const text = await response.text()
        console.error('API error response:', text)
        setError(`Failed to load favorites: ${response.status}`)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      if (data.favorites) {
        setFavorites(data.favorites)
      } else {
        setFavorites([])
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
      setError(err instanceof Error ? err.message : 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'de-DE'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const removeFavorite = async (id: string) => {
    try {
      if (!firebaseAuth) return
      const user = firebaseAuth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` }
      await fetch(`/api/favorites/${id}`, { method: 'DELETE', headers })
      loadFavorites()
    } catch (err) {
      console.error('Failed to remove favorite')
    }
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}>
        <Stack direction="vertical" gap="spacious">
          <Stack direction="horizontal" gap="normal" align="center">
            <Button onClick={() => router.back()} leadingVisual={ArrowLeftIcon}>
              Back
            </Button>
            <Heading as="h1" variant="large">Favorites</Heading>
          </Stack>

          {loading ? (
            <Text>Loading favorites...</Text>
          ) : error ? (
            <Text style={{ color: 'var(--fgColor-danger)' }}>{error}</Text>
          ) : favorites.length === 0 ? (
            <Text style={{ color: 'var(--fgColor-muted)' }}>No favorites yet. Add vocabulary or analyses to your favorites!</Text>
          ) : (
            <Stack direction="vertical" gap="normal">
              {favorites.map((fav, index) => (
                <div key={fav.id || index} style={{ 
                  background: 'var(--bgColor-muted)', 
                  borderRadius: 12, 
                  padding: 24,
                  border: 'var(--borderWidth-thin) solid var(--borderColor-default)'
                }}>
                  <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Stack direction="horizontal" align="center" gap="condensed">
                      <span style={{ color: 'var(--fgColor-accent)' }}>
                        <HeartFillIcon />
                      </span>
                      <Text weight="semibold">{fav.type === 'vocabulary' ? 'Vocabulary' : 'Analysis'}</Text>
                      {fav.learningLevel && (
                        <Label variant="secondary">{fav.learningLevel}</Label>
                      )}
                    </Stack>
                    <Button 
                      variant="danger" 
                      size="small" 
                      leadingVisual={<TrashIcon size={14} />}
                      onClick={() => removeFavorite(fav.id)}
                    >
                      Remove
                    </Button>
                  </Stack>

                  {fav.german && (
                    <div style={{ marginBottom: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                      <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 8 }}>
                        <Text weight="semibold" style={{ fontSize: 16 }}>{fav.german}</Text>
                        <Button 
                          variant="default" 
                          size="small" 
                          leadingVisual={<PlayIcon size={14} />}
                          onClick={() => speakText(fav.german)}
                        >
                          Listen
                        </Button>
                      </Stack>
                      <Text size="small">{fav.english || fav.translation}</Text>
                      {fav.context && <Text size="small" style={{ color: 'var(--fgColor-muted)', marginTop: 4 }}>{fav.context}</Text>}
                    </div>
                  )}

                  {fav.description && (
                    <div style={{ padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                      <Text size="small">{fav.description}</Text>
                    </div>
                  )}
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </div>
    </main>
  )
}
