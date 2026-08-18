'use client'

import { useState, useEffect } from 'react'
import { Button, Heading, Label, Stack, Text } from '@primer/react'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, PlayIcon, TrashIcon, SyncIcon } from '@primer/octicons-react'
import { useRouter } from 'next/navigation'

export default function VocabularyPage() {
  const router = useRouter()
  const [vocabulary, setVocabulary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'learning' | 'mastered'>('all')

  useEffect(() => {
    loadVocabulary()
  }, [])

  const loadVocabulary = async () => {
    try {
      const response = await fetch('/api/vocabulary')
      const data = await response.json()
      if (data.vocabulary) {
        setVocabulary(data.vocabulary)
      }
    } catch (error) {
      console.error('Failed to load vocabulary:', error)
    } finally {
      setLoading(false)
    }
  }

  const speakWord = (word: string) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'de-DE'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const markAsLearned = async (id: string, learned: boolean) => {
    try {
      await fetch(`/api/vocabulary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learned })
      })
      loadVocabulary()
    } catch (error) {
      console.error('Failed to update vocabulary:', error)
    }
  }

  const deleteVocabulary = async (id: string) => {
    try {
      await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' })
      loadVocabulary()
    } catch (error) {
      console.error('Failed to delete vocabulary:', error)
    }
  }

  const filteredVocabulary = vocabulary.filter(v => {
    if (filter === 'all') return true
    if (filter === 'learning') return !v.learned
    if (filter === 'mastered') return v.learned
    return true
  })

  const learningCount = vocabulary.filter(v => !v.learned).length
  const masteredCount = vocabulary.filter(v => v.learned).length

  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}>
        <Stack direction="vertical" gap="spacious">
          <Stack direction="horizontal" justify="space-between" align="center">
            <Stack direction="horizontal" gap="normal" align="center">
              <Button onClick={() => router.back()} leadingVisual={ArrowLeftIcon}>
                Back
              </Button>
              <Heading as="h1" variant="large">My Vocabulary</Heading>
            </Stack>
          </Stack>

          <Stack direction="horizontal" gap="normal" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
              <Label variant="accent">Total Words</Label>
              <Heading as="h2" variant="large">{vocabulary.length}</Heading>
            </div>
            <div style={{ flex: '1 1 200px', border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
              <Label variant="attention">Learning</Label>
              <Heading as="h2" variant="large">{learningCount}</Heading>
            </div>
            <div style={{ flex: '1 1 200px', border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
              <Label variant="success">Mastered</Label>
              <Heading as="h2" variant="large">{masteredCount}</Heading>
            </div>
          </Stack>

          <Stack direction="horizontal" gap="condensed">
            <Button 
              variant={filter === 'all' ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilter('all')}
            >
              All ({vocabulary.length})
            </Button>
            <Button 
              variant={filter === 'learning' ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilter('learning')}
            >
              Learning ({learningCount})
            </Button>
            <Button 
              variant={filter === 'mastered' ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilter('mastered')}
            >
              Mastered ({masteredCount})
            </Button>
          </Stack>

          {loading ? (
            <Text>Loading vocabulary...</Text>
          ) : filteredVocabulary.length === 0 ? (
            <Text style={{ color: 'var(--fgColor-muted)' }}>No vocabulary found. Upload images to build your vocabulary!</Text>
          ) : (
            <Stack direction="vertical" gap="normal">
              {filteredVocabulary.map((vocab) => (
                <div key={vocab.id} style={{ 
                  border: 'var(--borderWidth-thin) solid var(--borderColor-default)', 
                  borderRadius: 12, 
                  padding: 20,
                  background: vocab.learned ? 'var(--bgColor-success-muted)' : 'var(--bgColor-default)'
                }}>
                  <Stack direction="horizontal" justify="space-between" align="center">
                    <Stack direction="horizontal" gap="normal" align="center">
                      <span style={{ color: vocab.learned ? 'var(--fgColor-success)' : 'var(--fgColor-attention)' }}>
                        {vocab.learned ? <CheckCircleIcon /> : <SyncIcon />}
                      </span>
                      <Stack direction="vertical" gap="condensed">
                        <Stack direction="horizontal" gap="condensed" align="center">
                          <Text weight="semibold" style={{ fontSize: 18 }}>{vocab.german}</Text>
                          {vocab.type && <Label variant="secondary" size="small">{vocab.type}</Label>}
                        </Stack>
                        <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>{vocab.english}</Text>
                        {vocab.context && <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>{vocab.context}</Text>}
                      </Stack>
                    </Stack>
                    <Stack direction="horizontal" gap="condensed">
                      <Button 
                        variant="default" 
                        size="small"
                        leadingVisual={<PlayIcon size={14} />}
                        onClick={() => speakWord(vocab.german)}
                      >
                        Listen
                      </Button>
                      <Button 
                        variant={vocab.learned ? 'default' : 'primary'}
                        size="small"
                        onClick={() => markAsLearned(vocab.id, !vocab.learned)}
                      >
                        {vocab.learned ? 'Mark Learning' : 'Mark Mastered'}
                      </Button>
                      <Button 
                        variant="danger" 
                        size="small"
                        leadingVisual={<TrashIcon size={14} />}
                        onClick={() => deleteVocabulary(vocab.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </div>
    </main>
  )
}
