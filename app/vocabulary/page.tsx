'use client'

import { useState, useEffect } from 'react'
import { Button, Heading, Label, Stack, Text, FormControl, TextInput } from '@primer/react'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, PlayIcon, TrashIcon, SyncIcon, ArrowRightIcon } from '@primer/octicons-react'
import { useRouter } from 'next/navigation'
import { getAuth } from 'firebase/auth'

export default function VocabularyPage() {
  const router = useRouter()
  const [vocabulary, setVocabulary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'learning' | 'mastered'>('all')
  const [practiceMode, setPracticeMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [practiceScore, setPracticeScore] = useState(0)

  useEffect(() => {
    loadVocabulary()
  }, [])

  const loadVocabulary = async () => {
    setLoading(true)
    try {
      const auth = getAuth()
      const user = auth.currentUser
      const headers: Record<string, string> = {}
      if (user) {
        const token = await user.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch('/api/vocabulary', { headers })
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
      const auth = getAuth()
      const user = auth.currentUser
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user) {
        const token = await user.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }
      await fetch(`/api/vocabulary/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ learned })
      })
      loadVocabulary()
    } catch (error) {
      console.error('Failed to update vocabulary:', error)
    }
  }

  const deleteVocabulary = async (id: string) => {
    try {
      const auth = getAuth()
      const user = auth.currentUser
      const headers: Record<string, string> = {}
      if (user) {
        const token = await user.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }
      await fetch(`/api/vocabulary/${id}`, { method: 'DELETE', headers })
      loadVocabulary()
    } catch (error) {
      console.error('Failed to delete vocabulary:', error)
    }
  }

  const startPractice = () => {
    setPracticeMode(true)
    setCurrentIndex(0)
    setUserAnswer('')
    setShowResult(false)
    setPracticeScore(0)
  }

  const handlePracticeCheck = () => {
    const currentWord = vocabulary[currentIndex]
    const isCorrect = userAnswer.toLowerCase().trim() === currentWord.english.toLowerCase().trim()
    setCorrect(isCorrect)
    setShowResult(true)
    if (isCorrect) setPracticeScore(prev => prev + 1)
  }

  const handlePracticeNext = () => {
    setCurrentIndex(prev => prev + 1)
    setUserAnswer('')
    setShowResult(false)
  }

  const filteredVocabulary = vocabulary.filter(v => {
    if (filter === 'all') return true
    if (filter === 'learning') return !v.learned
    if (filter === 'mastered') return v.learned
    return true
  })

  const learningCount = vocabulary.filter(v => !v.learned).length
  const masteredCount = vocabulary.filter(v => v.learned).length

  if (practiceMode && filteredVocabulary.length > 0) {
    const currentWord = filteredVocabulary[currentIndex % filteredVocabulary.length]
    
    return (
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}>
          <Stack direction="vertical" gap="spacious">
            <Stack direction="horizontal" justify="space-between" align="center">
              <Stack direction="horizontal" gap="normal" align="center">
                <Button onClick={() => setPracticeMode(false)} leadingVisual={ArrowLeftIcon}>
                  Back to Vocabulary
                </Button>
                <Heading as="h1" variant="large">Practice Mode</Heading>
              </Stack>
              <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Score: {practiceScore}/{currentIndex + 1}</Text>
            </Stack>

            <Stack direction="vertical" gap="normal" style={{ padding: 32, background: 'var(--bgColor-default)', borderRadius: 12, border: 'var(--borderWidth-thin) solid var(--borderColor-default)' }}>
              <Stack direction="horizontal" justify="space-between" align="center">
                <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>What does this German word mean?</Text>
                <Button variant="default" size="small" onClick={() => speakWord(currentWord.german)}>🔊 Listen</Button>
              </Stack>
              <Heading as="h2" variant="large" style={{ fontSize: 40 }}>{currentWord.german}</Heading>
              {currentWord.type && <Label variant="secondary">{currentWord.type}</Label>}
              
              <FormControl>
                <FormControl.Label>Type the meaning in English:</FormControl.Label>
                <TextInput
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={showResult}
                  placeholder="Type the English meaning..."
                  size="large"
                />
              </FormControl>

              {showResult ? (
                <Stack direction="horizontal" gap="normal" align="center">
                  <Button variant="primary" onClick={handlePracticeNext} trailingVisual={ArrowRightIcon}>
                    Next Word
                  </Button>
                  {correct ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fgColor-success)' }}>
                      <CheckCircleIcon />
                      <Text>Correct!</Text>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fgColor-danger)' }}>
                      <XCircleIcon />
                      <Text>Answer: {currentWord.english}</Text>
                    </div>
                  )}
                </Stack>
              ) : (
                <Button variant="primary" onClick={handlePracticeCheck} disabled={!userAnswer.trim()}>
                  Check Answer
                </Button>
              )}
            </Stack>
          </Stack>
        </div>
      </main>
    )
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
            {filteredVocabulary.length > 0 && (
              <Button 
                variant="primary"
                size="small"
                onClick={startPractice}
              >
                Practice ({filteredVocabulary.length})
              </Button>
            )}
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
