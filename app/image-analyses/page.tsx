'use client'

import { useState, useEffect } from 'react'
import { Button, Heading, Label, Stack, Text } from '@primer/react'
import { ArrowLeftIcon, CheckCircleIcon, PlayIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, HeartIcon, HeartFillIcon } from '@primer/octicons-react'
import { useRouter } from 'next/navigation'
import { firebaseAuth } from '@/lib/firebase'

export default function ImageAnalysesPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())
  const [showFavoriteToast, setShowFavoriteToast] = useState(false)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      if (!firebaseAuth) {
        setError('Firebase not configured')
        setLoading(false)
        return
      }
      const user = firebaseAuth.currentUser
      if (!user) {
        setError('Please sign in to view analyses')
        setLoading(false)
        return
      }
      const token = await user.getIdToken()
      const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` }
      const response = await fetch('/api/image-analysis', { headers })
      
      if (!response.ok) {
        const text = await response.text()
        console.error('API error response:', text)
        setError(`Failed to load analyses: ${response.status} ${response.statusText}`)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      if (data.analyses) {
        setAnalyses(data.analyses)
      } else {
        setAnalyses([])
      }
    } catch (err) {
      console.error('Failed to load analyses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analyses')
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

  const deleteAnalysis = async (id: string) => {
    try {
      if (!firebaseAuth) return
      const user = firebaseAuth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` }
      await fetch(`/api/image-analysis/${id}`, { method: 'DELETE', headers })
      loadAnalyses()
    } catch (err) {
      console.error('Failed to delete')
    }
  }

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addToFavorites = async (analysis: any) => {
    try {
      if (!firebaseAuth) return
      const user = firebaseAuth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'analysis',
          german: analysis.germanText,
          english: analysis.translation,
          description: analysis.description,
          learningLevel: analysis.learningLevel
        })
      })
      
      if (response.ok) {
        setFavoritedIds(prev => new Set([...prev, analysis.id]))
        setShowFavoriteToast(true)
        setTimeout(() => setShowFavoriteToast(false), 2000)
      }
    } catch (error) {
      console.error('Failed to add to favorites:', error)
    }
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      {showFavoriteToast && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-success-fg)',
          color: 'var(--color-success-emphasis)',
          padding: '12px 24px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14
        }}>
          <HeartFillIcon size={16} />
          <Text>Added to favorites</Text>
        </div>
      )}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}>
        <Stack direction="vertical" gap="spacious">
          <Stack direction="horizontal" justify="space-between" align="center">
            <Stack direction="horizontal" gap="normal" align="center">
              <Button onClick={() => router.back()} leadingVisual={ArrowLeftIcon}>
                Back
              </Button>
              <Heading as="h1" variant="large">Image Analyses</Heading>
            </Stack>
          </Stack>

          {loading ? (
            <Text>Loading analyses...</Text>
          ) : error ? (
            <Text style={{ color: 'var(--fgColor-danger)' }}>{error}</Text>
          ) : analyses.length === 0 ? (
            <Text style={{ color: 'var(--fgColor-muted)' }}>No image analyses yet. Upload images in Teacher Mode!</Text>
          ) : (
            <Stack direction="vertical" gap="normal">
              {analyses.map((analysis, index) => {
                const id = analysis.id || String(index)
                const isExpanded = expanded.has(id)
                return (
                  <div key={id} style={{ 
                    background: 'var(--bgColor-muted)', 
                    borderRadius: 12, 
                    padding: 24,
                    border: 'var(--borderWidth-thin) solid var(--borderColor-default)'
                  }}>
                    <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 16 }}>
                      <Stack direction="horizontal" align="center" gap="condensed">
                        <Button 
                          variant="default" 
                          size="small" 
                          leadingVisual={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          onClick={() => toggleExpanded(id)}
                        />
                        <span style={{ color: 'var(--fgColor-success)' }}>
                          <CheckCircleIcon />
                        </span>
                        <Text weight="semibold">Analysis {index + 1}</Text>
                        {analysis.learningLevel && (
                          <Label variant="secondary">{analysis.learningLevel}</Label>
                        )}
                      </Stack>
                      <Stack direction="horizontal" gap="condensed">
                        <Button 
                          variant="default"
                          size="small"
                          leadingVisual={favoritedIds.has(id) ? <HeartFillIcon size={14} /> : <HeartIcon size={14} />}
                          onClick={() => addToFavorites(analysis)}
                          style={favoritedIds.has(id) ? { color: 'var(--fgColor-accent)' } : undefined}
                        >
                          Favorite
                        </Button>
                        <Button 
                          variant="danger" 
                          size="small" 
                          leadingVisual={<TrashIcon size={14} />}
                          onClick={() => deleteAnalysis(analysis.id)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>

                    {isExpanded && (
                      <>
                        {analysis.germanText && (
                          <div style={{ marginBottom: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                            <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 8 }}>
                              <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>German Text:</Text>
                              <Button 
                                variant="default" 
                                size="small" 
                                leadingVisual={<PlayIcon size={14} />}
                                onClick={() => speakText(analysis.germanText)}
                              >
                                Listen
                              </Button>
                            </Stack>
                            <Text style={{ fontSize: 16, lineHeight: 1.6 }}>{analysis.germanText}</Text>
                          </div>
                        )}

                        {analysis.translation && (
                          <div style={{ marginBottom: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                            <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>Translation:</Text>
                            <Text style={{ fontSize: 14, lineHeight: 1.6 }}>{analysis.translation}</Text>
                          </div>
                        )}

                        {analysis.description && (
                          <div style={{ marginBottom: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                            <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>Description:</Text>
                            <Text size="small">{analysis.description}</Text>
                          </div>
                        )}

                        {analysis.vocabulary && analysis.vocabulary.length > 0 && (
                          <div>
                            <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 12 }}>Vocabulary:</Text>
                            <Stack direction="vertical" gap="condensed">
                              {analysis.vocabulary.map((vocab: any, vIndex: number) => (
                                <div key={vIndex} style={{ 
                                  padding: 12, 
                                  background: 'var(--bgColor-default)', 
                                  borderRadius: 8,
                                  border: 'var(--borderWidth-thin) solid var(--borderColor-muted)'
                                }}>
                                  <Stack direction="horizontal" justify="space-between" align="center">
                                    <Stack direction="vertical" gap="condensed">
                                      <Text weight="semibold" style={{ fontSize: 16 }}>{vocab.german || vocab.word}</Text>
                                      <Text size="small">{vocab.english || vocab.translation}</Text>
                                      {vocab.type && <Label variant="secondary" size="small">{vocab.type}</Label>}
                                    </Stack>
                                    <Button 
                                      variant="default" 
                                      size="small" 
                                      leadingVisual={<PlayIcon size={14} />}
                                      onClick={() => speakText(vocab.german || vocab.word)}
                                    >
                                      Listen
                                    </Button>
                                  </Stack>
                                </div>
                              ))}
                            </Stack>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </Stack>
          )}
        </Stack>
      </div>
    </main>
  )
}
