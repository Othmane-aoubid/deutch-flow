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
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}${data.details ? ` (${data.details})` : ''}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process your request.' }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      position: 'fixed',
      bottom: 20,
      right: 20,
      left: 'max(20px, calc(50% - 200px))',
      width: 'calc(100% - 40px)',
      maxWidth: 400,
      maxHeight: '70vh',
      background: 'var(--bgColor-default)',
      borderRadius: 12,
      border: 'var(--borderWidth-thin) solid var(--borderColor-default)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      <Stack direction="horizontal" justify="space-between" align="center" style={{ padding: 16, borderBottom: 'var(--borderWidth-thin) solid var(--borderColor-default)', background: 'var(--bgColor-muted)', borderRadius: '12px 12px 0 0' }}>
        <Stack direction="horizontal" gap="condensed" align="center">
          <span style={{ color: 'var(--fgColor-accent)' }}>💬</span>
          <Heading as="h3" variant="medium" style={{ fontSize: 14 }}>AI Tutor</Heading>
        </Stack>
        {onClose && (
          <Button variant="invisible" size="small" onClick={onClose} style={{ padding: 4 }}>
            <XIcon size={16} />
          </Button>
        )}
      </Stack>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Text style={{ color: 'var(--fgColor-muted)', fontSize: 13, lineHeight: 1.5 }}>
              Ask me anything about German! I can help with translations, examples, grammar, and vocabulary.
            </Text>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: 12,
            background: msg.role === 'user' ? 'var(--color-accent-fg)' : 'var(--bgColor-muted)',
            color: msg.role === 'user' ? 'var(--color-accent-emphasis)' : 'var(--fgColor-default)',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            fontSize: 13,
            lineHeight: 1.4,
            wordBreak: 'break-word'
          }}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'var(--bgColor-muted)', borderRadius: 12 }}>
            <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Thinking...</Text>
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: 'var(--borderWidth-thin) solid var(--borderColor-default)', background: 'var(--bgColor-muted)', borderRadius: '0 0 12px 12px' }}>
        <Stack direction="horizontal" gap="condensed">
          <TextInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about German..."
            size="small"
            style={{ 
              flex: 1,
              fontSize: 13,
              padding: '6px 10px'
            }}
            block
          />
          <Button 
            variant="primary" 
            size="small"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{ padding: '6px 12px', minWidth: 60 }}
          >
            Send
          </Button>
        </Stack>
      </div>
    </div>
  )
}
