'use client'

import { useState } from 'react'
import { Button, FormControl, Heading, Label, Stack, Text, TextInput } from '@primer/react'
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon } from '@primer/octicons-react'

interface ExerciseModeProps {
  vocabulary?: any[]
  onBack?: () => void
}

export function ExerciseMode({ vocabulary = [], onBack }: ExerciseModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [exerciseType, setExerciseType] = useState<'translation' | 'fill-blank'>('translation')

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
    if (isCorrect) setScore(prev => prev + 1)
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
          <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Score: {score}/{currentIndex + 1}</Text>
        </Stack>

        <Stack direction="horizontal" gap="condensed">
          <Button 
            variant={exerciseType === 'translation' ? 'primary' : 'default'}
            size="small"
            onClick={() => setExerciseType('translation')}
          >
            Translation
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
              <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Translate to English:</Text>
              <Button variant="default" size="small" onClick={handleSpeak}>🔊 Listen</Button>
            </Stack>
            <Heading as="h3" variant="large" style={{ fontSize: 32 }}>{germanWord}</Heading>
            {currentWord.type && <Label variant="secondary">{currentWord.type}</Label>}
            
            <FormControl>
              <FormControl.Label>Your answer:</FormControl.Label>
              <TextInput
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={showResult}
                placeholder="Type the English translation..."
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
