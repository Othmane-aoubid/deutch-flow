'use client'

import { useState, useEffect } from 'react'
import { Button, FormControl, Heading, Label, Stack, Text, TextInput } from '@primer/react'
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon } from '@primer/octicons-react'
import { getAuth } from 'firebase/auth'

interface ExerciseModeProps {
  vocabulary?: any[]
  onBack?: () => void
}

export function ExerciseMode({ vocabulary: propVocabulary = [], onBack }: ExerciseModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [exerciseType, setExerciseType] = useState<'translation' | 'fill-blank'>('translation')
  const [vocabulary, setVocabulary] = useState<any[]>(propVocabulary)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load vocabulary from Firestore if not provided
    if (propVocabulary.length === 0) {
      loadVocabulary()
    }
    // Load exercise progress
    loadProgress()
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

  const loadProgress = async () => {
    try {
      const auth = getAuth()
      const user = auth.currentUser
      const headers: Record<string, string> = {}
      if (user) {
        const token = await user.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch('/api/exercise-progress', { headers })
      const data = await response.json()
      if (data.score !== undefined) {
        setScore(data.score)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
    }
  }

  const saveProgress = async (newScore: number, newTotal: number, newCorrect: number) => {
    try {
      const auth = getAuth()
      const user = auth.currentUser
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user) {
        const token = await user.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }
      await fetch('/api/exercise-progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ score: newScore, total: newTotal, correct: newCorrect })
      })
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
        <Text>Loading vocabulary...</Text>
      </div>
    )
  }

  if (vocabulary.length === 0) {
    return (
      <div style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
        <Stack direction="vertical" gap="normal" align="center">
          <Text style={{ color: 'var(--fgColor-muted)' }}>No vocabulary available for exercises. Upload an image first!</Text>
        </Stack>
      </div>
    )
  }

  const currentWord = vocabulary[currentIndex % vocabulary.length]
  const germanWord = currentWord.german || currentWord.word
  const englishWord = currentWord.english || currentWord.translation

  const handleCheck = () => {
    const isCorrect = userAnswer.toLowerCase().trim() === englishWord.toLowerCase().trim()
    setCorrect(isCorrect)
    setShowResult(true)
    if (isCorrect) {
      const newScore = score + 1
      const newTotal = total + 1
      setScore(newScore)
      setTotal(newTotal)
      saveProgress(newScore, newTotal, newScore)
    } else {
      const newTotal = total + 1
      setTotal(newTotal)
      saveProgress(score, newTotal, score)
    }
  }

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1)
    setUserAnswer('')
    setShowResult(false)
  }

  const handleSpeak = () => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(germanWord)
    utterance.lang = 'de-DE'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
      <Stack direction="vertical" gap="normal">
        <Stack direction="horizontal" justify="space-between" align="center">
          <Heading as="h2" variant="medium">Practice Mode</Heading>
          <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Score: {score}/{total}</Text>
        </Stack>

        <Stack direction="horizontal" gap="condensed">
          <Button 
            variant={exerciseType === 'translation' ? 'primary' : 'default'}
            size="small"
            onClick={() => setExerciseType('translation')}
          >
            German to English
          </Button>
          <Button 
            variant={exerciseType === 'fill-blank' ? 'primary' : 'default'}
            size="small"
            onClick={() => setExerciseType('fill-blank')}
          >
            Fill in Blank
          </Button>
        </Stack>

        {exerciseType === 'translation' ? (
          <Stack direction="vertical" gap="normal" style={{ padding: 20, background: 'var(--bgColor-default)', borderRadius: 8 }}>
            <Stack direction="horizontal" justify="space-between" align="center">
              <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>What does this German word mean?</Text>
              <Button variant="default" size="small" onClick={handleSpeak}>🔊 Listen</Button>
            </Stack>
            <Heading as="h3" variant="large" style={{ fontSize: 32 }}>{germanWord}</Heading>
            {currentWord.type && <Label variant="secondary">{currentWord.type}</Label>}
            
            <FormControl>
              <FormControl.Label>Type the meaning in English:</FormControl.Label>
              <TextInput
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={showResult}
                placeholder="Type the English meaning..."
              />
            </FormControl>

            {showResult ? (
              <Stack direction="horizontal" gap="normal">
                <Button variant="primary" onClick={handleNext} trailingVisual={ArrowRightIcon}>
                  Next
                </Button>
                {correct ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fgColor-success)' }}>
                    <CheckCircleIcon />
                    <Text>Correct!</Text>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fgColor-danger)' }}>
                    <XCircleIcon />
                    <Text>Answer: {englishWord}</Text>
                  </div>
                )}
              </Stack>
            ) : (
              <Button variant="primary" onClick={handleCheck} disabled={!userAnswer.trim()}>
                Check
              </Button>
            )}
          </Stack>
        ) : (
          <Stack direction="vertical" gap="normal" style={{ padding: 20, background: 'var(--bgColor-default)', borderRadius: 8 }}>
            <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Fill in the blank:</Text>
            <Text style={{ fontSize: 18 }}>
              Ich {userAnswer || '____'} {germanWord.includes(' ') ? germanWord.split(' ').slice(1).join(' ') : ''}
            </Text>
            
            <FormControl>
              <FormControl.Label>Missing word:</FormControl.Label>
              <TextInput
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={showResult}
                placeholder="Type the missing German word..."
              />
            </FormControl>

            {showResult ? (
              <Stack direction="horizontal" gap="normal">
                <Button variant="primary" onClick={handleNext} trailingVisual={ArrowRightIcon}>
                  Next
                </Button>
                {correct ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fgColor-success)' }}>
                    <CheckCircleIcon />
                    <Text>Correct!</Text>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fgColor-danger)' }}>
                    <XCircleIcon />
                    <Text>Answer: {germanWord.split(' ')[0]}</Text>
                  </div>
                )}
              </Stack>
            ) : (
              <Button variant="primary" onClick={handleCheck} disabled={!userAnswer.trim()}>
                Check
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </div>
  )
}
