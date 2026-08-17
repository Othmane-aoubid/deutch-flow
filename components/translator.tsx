'use client'

import { useState } from 'react'
import { Button, FormControl, Heading, Label, Stack, Text, TextInput } from '@primer/react'

interface TranslatorProps {
  text?: string
  onTranslation?: (translation: string, language: string) => void
}

export function Translator({ text, onTranslation }: TranslatorProps) {
  const [inputText, setInputText] = useState(text || '')
  const [targetLanguage, setTargetLanguage] = useState<'English' | 'Arabic'>('English')
  const [translation, setTranslation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [speaking, setSpeaking] = useState(false)

  const handleTranslate = async () => {
    if (!inputText.trim()) return
    
    setLoading(true)
    setError('')
    setTranslation('')
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, targetLanguage })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setTranslation(result.translation)
        if (onTranslation) onTranslation(result.translation, targetLanguage)
      } else {
        setError(result.error || 'Translation failed')
      }
    } catch (err) {
      setError('Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSpeak = () => {
    if (!translation || !window.speechSynthesis) return
    
    setSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(translation)
    utterance.lang = targetLanguage === 'Arabic' ? 'ar-SA' : 'en-US'
    utterance.rate = 0.9
    
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24, background: 'var(--bgColor-muted)' }}>
      <Stack direction="vertical" gap="normal">
        <Heading as="h2" variant="medium">German Translator</Heading>
        <Text style={{ color: 'var(--fgColor-muted)' }}>Translate German text to English or Arabic</Text>
        
        <FormControl>
          <FormControl.Label>German Text</FormControl.Label>
          <TextInput
            as="textarea"
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter German text to translate..."
            style={{ resize: 'vertical', minHeight: 100 }}
          />
        </FormControl>
        
        <Stack direction="horizontal" gap="normal">
          <FormControl style={{ flex: 1 }}>
            <FormControl.Label>Target Language</FormControl.Label>
            <TextInput
              as="select"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as 'English' | 'Arabic')}
            >
              <option value="English">English</option>
              <option value="Arabic">Arabic</option>
            </TextInput>
          </FormControl>
          
          <Button 
            variant="primary" 
            onClick={handleTranslate}
            disabled={loading || !inputText.trim()}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? 'Translating...' : 'Translate'}
          </Button>
        </Stack>
        
        {error && <Text style={{ color: 'var(--fgColor-danger)' }}>{error}</Text>}
        
        {translation && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8, border: 'var(--borderWidth-thin) solid var(--borderColor-muted)' }}>
            <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 8 }}>
              <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Translation ({targetLanguage}):</Text>
              <Button 
                variant="default" 
                size="small" 
                onClick={handleSpeak}
                disabled={speaking}
              >
                {speaking ? 'Speaking...' : '🔊 Speak'}
              </Button>
            </Stack>
            <Text style={{ direction: targetLanguage === 'Arabic' ? 'rtl' : 'ltr', fontSize: targetLanguage === 'Arabic' ? 18 : 14 }}>
              {translation}
            </Text>
          </div>
        )}
      </Stack>
    </div>
  )
}
