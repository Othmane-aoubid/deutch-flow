'use client'

import { useState } from 'react'
import { Button, FormControl, Heading, Label, Stack, Text, TextInput } from '@primer/react'
import { ArrowRightIcon, XIcon } from '@primer/octicons-react'

interface AIChatProps {
  onClose?: () => void
}

export function AIChat({ onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await response.json()
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process your request.' }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 400,
      maxHeight: 600,
      background: 'var(--bgColor-default)',
      borderRadius: 12,
      border: 'var(--borderWidth-thin) solid var(--borderColor-default)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      <Stack direction="horizontal" justify="space-between" align="center" style={{ padding: 16, borderBottom: 'var(--borderWidth-thin) solid var(--borderColor-default)' }}>
        <Heading as="h3" variant="medium">AI Tutor</Heading>
        {onClose && (
          <Button variant="default" size="small" leadingVisual={<XIcon />} onClick={onClose} />
        )}
      </Stack>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <Text style={{ color: 'var(--fgColor-muted)', textAlign: 'center' }}>
            Ask me anything about German! I can help with translations, examples, grammar, and vocabulary.
          </Text>
        )}
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            maxWidth: '80%',
            padding: 12,
            borderRadius: 8,
            background: msg.role === 'user' ? 'var(--bgColor-accent-muted)' : 'var(--bgColor-muted)',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <Text size="small">{msg.content}</Text>
          </div>
        ))}
        {loading && (
          <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Thinking...</Text>
        )}
      </div>

      <div style={{ padding: 16, borderTop: 'var(--borderWidth-thin) solid var(--borderColor-default)' }}>
        <Stack direction="horizontal" gap="condensed">
          <TextInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about German..."
            size="small"
            style={{ flex: 1 }}
          />
          <Button 
            variant="primary" 
            size="small"
            leadingVisual={<ArrowRightIcon />}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            Send
          </Button>
        </Stack>
      </div>
    </div>
  )
}
