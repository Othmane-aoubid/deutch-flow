'use client'

import { useState, useEffect } from 'react'
import { Button, Heading, Label, Stack, Text } from '@primer/react'
import { ArrowLeftIcon, CheckCircleIcon, PlayIcon, TrashIcon } from '@primer/octicons-react'
import { useRouter } from 'next/navigation'
import { firebaseAuth } from '@/lib/firebase'

export default function ImageAnalysesPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || data.details || 'Failed to load analyses')
        return
      }
      if (data.analyses) {
        setAnalyses(data.analyses)
      }
    } catch (err) {
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

  return (
    <main style={{ minHeight: '100vh' }}>
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
              {analyses.map((analysis, index) => (
                <div key={analysis.id || index} style={{ 
                  background: 'var(--bgColor-muted)', 
                  borderRadius: 12, 
                  padding: 24,
                  border: 'var(--borderWidth-thin) solid var(--borderColor-default)'
                }}>
                  <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Stack direction="horizontal" align="center" gap="condensed">
                      <span style={{ color: 'var(--fgColor-success)' }}>
                        <CheckCircleIcon />
                      </span>
                      <Text weight="semibold">Analysis {index + 1}</Text>
                      {analysis.learningLevel && (
                        <Label variant="secondary">{analysis.learningLevel}</Label>
                      )}
                    </Stack>
                    <Button 
                      variant="danger" 
                      size="small" 
                      leadingVisual={<TrashIcon size={14} />}
                      onClick={() => deleteAnalysis(analysis.id)}
                    >
                      Delete
                    </Button>
                  </Stack>

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
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </div>
    </main>
  )
}
