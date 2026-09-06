'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Heading, Label, Link, Stack, Text, TextInput } from '@primer/react'
import { BookIcon, ChevronRightIcon, GraphIcon, UnmuteIcon, PlayIcon, SparkleFillIcon, ArrowLeftIcon, CommentIcon, HeartIcon, UploadIcon } from '@primer/octicons-react'
import { AuthGate, SignOutButton } from '@/components/auth-gate'
import { apiFetch } from '@/lib/api'
import { ImageProcessor } from '@/components/image-processor'
import { Translator } from '@/components/translator'
import { AIChat } from '@/components/ai-chat'
import { useRouter } from 'next/navigation'
import { firebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function Page() {
  return <AuthGate><PageContent /></AuthGate>
}

function PageContent() {
  const router = useRouter()
  const [mode, setMode] = useState<'chooser' | 'teacher' | 'learner'>('chooser')
  const [recording, setRecording] = useState(false)
  const [lessonTitle, setLessonTitle] = useState('A conversation at the bakery')
  const [showChat, setShowChat] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string, audio?: string }>>([])
  const [status, setStatus] = useState('Ready when you are')

  if (mode === 'teacher') {
    return <TeacherMode recording={recording} setRecording={setRecording} lessonTitle={lessonTitle} setLessonTitle={setLessonTitle} status={status} setStatus={setStatus} onBack={() => setMode('chooser')} />
  }

  if (mode === 'learner') {
    return <LearnerMode onBack={() => setMode('chooser')} />
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bgColor-default)' }}>
      <Header onBack={() => setMode('chooser')} />
      <Stack direction="vertical" align="center" gap="spacious" style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 28px 96px' }}>
        <Stack direction="vertical" align="center" gap="condensed" style={{ textAlign: 'center', maxWidth: 700 }}>
          <Label variant="accent">DeutschFlow</Label>
          <Heading as="h1" variant="large" style={{ fontSize: 56, letterSpacing: '-0.04em' }}>Speak German with confidence.</Heading>
          <Text size="large" style={{ color: 'var(--fgColor-muted)', maxWidth: 580 }}>
            A calm, intelligent practice space for teachers and learners. Capture real conversations, understand every correction, and keep moving forward.
          </Text>
        </Stack>
        <Stack direction="horizontal" gap="normal" style={{ width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          <ModeCard icon={<UnmuteIcon size={24} />} label="Teacher Mode" title="Record a lesson" description="Capture classroom conversation with live transcription and AI-powered feedback." action="Start teaching" onClick={() => setMode('teacher')} />
          <ModeCard icon={<BookIcon size={24} />} label="Learner Mode" title="Review your progress" description="Return to saved lessons, practice corrections, and build lasting fluency." action="Open my lessons" onClick={() => setMode('learner')} />
          <ModeCard icon={<GraphIcon size={24} />} label="Vocabulary" title="My word bank" description="Review saved vocabulary, mark words as mastered, and practice pronunciation." action="View vocabulary" onClick={() => router.push('/vocabulary')} />
          <ModeCard icon={<HeartIcon size={24} />} label="Favorites" title="Saved items" description="View your favorite vocabulary and analyses for quick access." action="View favorites" onClick={() => router.push('/favorites')} />
          <ModeCard icon={<UploadIcon size={24} />} label="Image Processing" title="Upload images" description="Upload images for German learning content analysis using AI." action="Process images" onClick={() => router.push('/image-processing')} />
          <ModeCard icon={<SparkleFillIcon size={24} />} label="Image Analyses" title="AI image learning" description="View all your image analyses, practice vocabulary from images, and learn German from visual content." action="View analyses" onClick={() => router.push('/image-analyses')} />
        </Stack>
        <Stack direction="horizontal" gap="condensed" align="center" style={{ color: 'var(--fgColor-muted)' }}>
          <SparkleFillIcon size={16} /><Text size="small">Powered by NVIDIA NIM · Your audio is discarded after processing</Text>
        </Stack>
      </Stack>
      {showChat && <AIChat onClose={() => setShowChat(false)} messages={chatMessages} setMessages={setChatMessages} collapsed={chatCollapsed} onToggleCollapse={() => setChatCollapsed(!chatCollapsed)} />}
      {!showChat && (
        <Button
          variant="primary"
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            borderRadius: '50%',
            width: 56,
            height: 56,
            padding: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          leadingVisual={<CommentIcon size={24} />}
          onClick={() => setShowChat(true)}
        />
      )}
    </main>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return <header style={{ borderBottom: 'var(--borderWidth-thin) solid var(--borderColor-muted)', padding: '18px 28px' }}><Stack direction="horizontal" align="center" justify="space-between" style={{ maxWidth: 1160, margin: '0 auto' }}><Link href="#" onClick={(e) => { e.preventDefault(); onBack() }} muted={false} style={{ fontWeight: 700, fontSize: 18 }}>DeutschFlow</Link><Stack direction="horizontal" gap="normal" align="center"><Text size="small" style={{ color: 'var(--fgColor-muted)' }}>German conversation practice</Text><Label variant="success">Beta</Label><SignOutButton /></Stack></Stack></header>
}

function ModeCard({ icon, label, title, description, action, onClick }: { icon: React.ReactNode; label: string; title: string; description: string; action: string; onClick: () => void }) {
  return <div style={{ flex: '1 1 340px', maxWidth: 480, border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 28, background: 'var(--bgColor-muted)', boxShadow: 'var(--shadow-floating-medium)' }}><Stack direction="vertical" gap="normal"><Stack direction="horizontal" align="center" justify="space-between"><span style={{ color: 'var(--fgColor-accent)' }}>{icon}</span><Label variant="secondary">{label}</Label></Stack><Heading as="h2" variant="medium">{title}</Heading><Text style={{ color: 'var(--fgColor-muted)', minHeight: 48 }}>{description}</Text><Button variant="primary" trailingAction={ChevronRightIcon} onClick={onClick}>{action}</Button></Stack></div>
}

function LessonAnalysis({ analysis }: { analysis: any }) {
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'de-DE'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  if (typeof analysis === 'string' || analysis?.rawResponse) {
    return <Text size="small" style={{ whiteSpace: 'pre-wrap' }}>{typeof analysis === 'string' ? analysis : analysis.rawResponse}</Text>
  }
  const corrections = Array.isArray(analysis?.corrections) ? analysis.corrections : []
  const vocabulary = Array.isArray(analysis?.vocabulary) ? analysis.vocabulary : []
  const grammarPatterns = Array.isArray(analysis?.grammarPatterns) ? analysis.grammarPatterns : []
  const nextSteps = Array.isArray(analysis?.nextSteps) ? analysis.nextSteps : []
  if (!corrections.length && !vocabulary.length && !grammarPatterns.length && !nextSteps.length) {
    return <Text size="small" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(analysis, null, 2)}</Text>
  }
  return (
    <Stack direction="vertical" gap="normal">
      {corrections.length > 0 && (
        <Stack direction="vertical" gap="condensed">
          <Label variant="attention">Corrections ({corrections.length})</Label>
          {corrections.map((c: any, i: number) => (
            <div key={i} style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-muted)', borderRadius: 8, padding: 12, background: 'var(--bgColor-default)' }}>
              <Stack direction="horizontal" justify="space-between" align="center">
                <Text size="small"><del style={{ color: 'var(--fgColor-danger)' }}>{c.original}</del> → <strong style={{ color: 'var(--fgColor-success)' }}>{c.corrected}</strong></Text>
                <Button variant="invisible" size="small" leadingVisual={<PlayIcon size={14} />} onClick={() => speakText(c.corrected)} aria-label="Listen" />
              </Stack>
              {c.explanation && <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>{c.explanation}</Text>}
            </div>
          ))}
        </Stack>
      )}
      {vocabulary.length > 0 && (
        <Stack direction="vertical" gap="condensed">
          <Label variant="accent">Vocabulary ({vocabulary.length})</Label>
          {vocabulary.map((v: any, i: number) => (
            <Stack key={i} direction="horizontal" justify="space-between" align="center" style={{ borderBottom: 'var(--borderWidth-thin) solid var(--borderColor-muted)', paddingBottom: 4 }}>
              <Text size="small"><strong>{v.word || v.german}</strong> — {v.translation || v.english}{v.level ? ` (${v.level})` : ''}</Text>
              <Button variant="invisible" size="small" leadingVisual={<PlayIcon size={14} />} onClick={() => speakText(v.word || v.german)} aria-label="Listen" />
            </Stack>
          ))}
        </Stack>
      )}
      {grammarPatterns.length > 0 && (
        <Stack direction="vertical" gap="condensed">
          <Label variant="secondary">Grammar patterns</Label>
          {grammarPatterns.map((g: any, i: number) => (
            <Text key={i} size="small"><strong>{g.pattern}</strong>{g.explanation ? ` — ${g.explanation}` : ''}</Text>
          ))}
        </Stack>
      )}
      {nextSteps.length > 0 && (
        <Stack direction="vertical" gap="condensed">
          <Label variant="success">Next steps</Label>
          {nextSteps.map((s: string, i: number) => <Text key={i} size="small">• {s}</Text>)}
        </Stack>
      )}
    </Stack>
  )
}

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function TeacherMode({ recording, setRecording, lessonTitle, setLessonTitle, status, setStatus, onBack }: { recording: boolean; setRecording: (value: boolean) => void; lessonTitle: string; setLessonTitle: (value: string) => void; status: string; setStatus: (value: string) => void; onBack: () => void }) {
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [level, setLevel] = useState('A2')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        setAudioChunks(chunks)
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const duration = formatDuration(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))

        setStatus('Processing audio...')
        const formData = new FormData()
        formData.append('audio', audioBlob)

        try {
          const asrResponse = await apiFetch('/api/asr', { method: 'POST', body: formData })
          const asrResult = await asrResponse.json()

          if (asrResult.segments && asrResult.segments.length > 0) {
            const fullTranscript = asrResult.segments.map((s: any) => s.text).join(' ')
            setTranscript(fullTranscript)
            setStatus('Analyzing transcript...')

            const analyzeResponse = await apiFetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript: fullTranscript, level })
            })
            const analyzeResult = await analyzeResponse.json()
            if (!analyzeResponse.ok) {
              setStatus(`Analysis failed: ${analyzeResult.error || 'Unknown error'}`)
              stream.getTracks().forEach(track => track.stop())
              return
            }
            setAnalysis(analyzeResult.analysis ?? analyzeResult)
            setStatus('Saving lesson...')

            const saveResponse = await apiFetch('/api/lessons', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: lessonTitle,
                transcript: fullTranscript,
                analysis: analyzeResult.analysis ?? analyzeResult,
                level,
                duration
              })
            })
            if (!saveResponse.ok) {
              const errorData = await saveResponse.json().catch(() => ({}))
              setStatus(`Save failed: ${errorData.error || 'Unknown error'}`)
              stream.getTracks().forEach(track => track.stop())
              return
            }
            const { lesson } = await saveResponse.json()

            // Audio goes to Firebase Storage (no 1 MiB Firestore doc limit)
            const audioForm = new FormData()
            audioForm.append('audio', audioBlob)
            audioForm.append('lessonId', lesson.id)
            const audioResponse = await apiFetch('/api/lessons/audio', { method: 'POST', body: audioForm })
            if (!audioResponse.ok) {
              const errorData = await audioResponse.json().catch(() => ({}))
              setStatus(`Saved, but audio upload failed: ${errorData.error || 'Unknown error'}`)
            } else {
              setStatus('Lesson saved')
            }
          } else {
            setStatus('No speech detected in the recording')
          }
        } catch (error) {
          setStatus('Processing failed')
        }

        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setRecording(true)
      setRecordingSeconds(0)
      startedAtRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 1000)
      setStatus('Recording started')
    } catch (error) {
      setStatus('Microphone access denied')
      console.error(error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setRecording(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setStatus('Recording stopped')
    }
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      <Header onBack={onBack} />
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}>
        <Stack direction="vertical" gap="spacious">
          <Stack direction="horizontal" justify="space-between" align="end">
            <Stack direction="vertical" gap="condensed">
              <Label variant="accent">Teacher Mode</Label>
              <Heading as="h1" variant="large">Record a lesson</Heading>
              <Text style={{ color: 'var(--fgColor-muted)' }}>Speak naturally. DeutschFlow will listen for the moments that help learners grow.</Text>
            </Stack>
            <Button onClick={onBack}>Change mode</Button>
          </Stack>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(300px, .9fr)', gap: 24 }}>
            <section style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 28, background: 'var(--bgColor-muted)' }}>
              <Stack direction="vertical" gap="normal">
                <Stack direction="horizontal" gap="condensed">
                  <TextInput aria-label="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} style={{ flex: 1 }} />
                  <select aria-label="CEFR level" value={level} onChange={(e) => setLevel(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: 'var(--borderWidth-thin) solid var(--borderColor-default)', background: 'var(--bgColor-default)', color: 'var(--fgColor-default)' }}>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Stack>
                <div style={{ minHeight: 260, border: 'var(--borderWidth-thin) solid var(--borderColor-muted)', borderRadius: 8, padding: 20, background: 'var(--bgColor-default)' }}>
                  <Stack direction="vertical" gap="normal">
                    <Stack direction="horizontal" gap="condensed" align="center">
                      <span style={{ color: recording ? 'var(--fgColor-open)' : 'var(--fgColor-muted)' }}><UnmuteIcon /></span>
                      <Text weight="semibold">Live transcript</Text>
                      <Label variant={recording ? 'attention' : 'secondary'}>{recording ? 'Listening' : 'Waiting'}</Label>
                    </Stack>
                    <Text style={{ color: 'var(--fgColor-muted)', lineHeight: 1.7 }}>{transcript || (recording ? 'Listening...' : 'Your transcript will appear here as the conversation unfolds.')}</Text>
                  </Stack>
                </div>
                <Stack direction="horizontal" justify="space-between" align="center">
                  <Stack direction="horizontal" gap="condensed" align="center">
                    <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>{status}</Text>
                    {recording && <Text size="small" style={{ color: 'var(--fgColor-open)' }}>{formatDuration(recordingSeconds)}</Text>}
                  </Stack>
                  <Button variant="primary" leadingVisual={<UnmuteIcon />} onClick={recording ? stopRecording : startRecording}>{recording ? 'Stop recording' : 'Start recording'}</Button>
                </Stack>
              </Stack>
            </section>
            <Stack direction="vertical" gap="normal">
              <section style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 28, background: 'var(--bgColor-muted)' }}>
                <Stack direction="vertical" gap="normal">
                  <Heading as="h2" variant="medium">AI Feedback</Heading>
                  <Text style={{ color: 'var(--fgColor-muted)' }}>Corrections and learning suggestions will appear here.</Text>
                  <div style={{ minHeight: 200, border: 'var(--borderWidth-thin) solid var(--borderColor-muted)', borderRadius: 8, padding: 16, background: 'var(--bgColor-default)' }}>
                    {analysis ? (
                      <LessonAnalysis analysis={analysis} />
                    ) : (
                      <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Analysis will be generated when you stop recording.</Text>
                    )}
                  </div>
                </Stack>
              </section>
              <Translator text={transcript} />
              <ImageProcessor />
            </Stack>
          </div>
        </Stack>
      </div>
    </main>
  )
}

function LearnerMode({ onBack }: { onBack: () => void }) {
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseAuth) { setLoading(false); return }
    // Subscribe to auth state so a refresh mid-session still loads lessons.
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) { setLessons([]); setLoading(false); return }
      try {
        const res = await apiFetch('/api/lessons')
        if (!res.ok) throw new Error(`Failed to fetch lessons: ${res.status}`)
        const data = await res.json()
        setLessons(data.lessons ?? [])
      } catch (error) {
        console.error('Failed to load lessons:', error)
      } finally {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'de-DE'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const deleteLesson = async (lessonId: string) => {
    try {
      await apiFetch(`/api/lessons/${lessonId}`, { method: 'DELETE' })
      setLessons(prev => prev.filter(l => l.id !== lessonId))
    } catch (error) {
      console.error('Failed to delete lesson')
    }
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      <Header onBack={onBack} />
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}>
        <Stack direction="vertical" gap="spacious">
          <Stack direction="horizontal" justify="space-between" align="end">
            <Stack direction="vertical" gap="condensed">
              <Label variant="accent">Learner Mode</Label>
              <Heading as="h1" variant="large">Your learning space</Heading>
              <Text style={{ color: 'var(--fgColor-muted)' }}>Small conversations become confident habits.</Text>
            </Stack>
            <Button onClick={onBack}>Change mode</Button>
          </Stack>
          <Stack direction="horizontal" gap="normal" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
              <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Lessons completed</Text>
              <Heading as="h2" variant="large">{lessons.length}</Heading>
              <Text size="small">Keep your streak going</Text>
            </div>
          </Stack>
          <Stack direction="vertical" gap="normal">
            <Heading as="h2" variant="medium">Saved lessons</Heading>
            {loading ? (
              <Text>Loading lessons...</Text>
            ) : lessons.length === 0 ? (
              <Text style={{ color: 'var(--fgColor-muted)' }}>No lessons yet. Start recording in Teacher Mode!</Text>
            ) : (
              lessons.map((lesson) => (
                <div key={lesson.id} style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 20 }}>
                  <Stack direction="horizontal" justify="space-between" align="center">
                    <Stack direction="horizontal" gap="normal" align="center">
                      <span style={{ color: 'var(--fgColor-accent)' }}><PlayIcon size={20} /></span>
                      <Stack direction="vertical" gap="condensed">
                        <Text weight="semibold">{lesson.title}</Text>
                        <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>{lesson.level} · {lesson.duration} · {new Date(lesson.createdAt).toLocaleDateString()}</Text>
                      </Stack>
                    </Stack>
                    <Stack direction="horizontal" gap="condensed">
                      <Button 
                        variant="default" 
                        size="small"
                        onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                      >
                        {expandedLesson === lesson.id ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button 
                        variant="danger" 
                        size="small"
                        onClick={() => deleteLesson(lesson.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                  {expandedLesson === lesson.id && lesson.transcript && (
                    <div style={{ marginTop: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                      <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 8 }}>
                        <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Transcript:</Text>
                        <Stack direction="horizontal" gap="condensed">
                          {(lesson.audioPath || lesson.audio) && (
                            <Button 
                              variant="default" 
                              size="small" 
                              leadingVisual={<PlayIcon size={14} />}
                              onClick={() => {
                                const src = lesson.audioPath ? `/api/lessons/audio?path=${encodeURIComponent(lesson.audioPath)}` : lesson.audio
                                new Audio(src).play()
                              }}
                            >
                              Play Recording
                            </Button>
                          )}
                          <Button 
                            variant="default" 
                            size="small" 
                            leadingVisual={<PlayIcon size={14} />}
                            onClick={() => speakText(lesson.transcript)}
                          >
                            Listen
                          </Button>
                        </Stack>
                      </Stack>
                      <Text size="small" style={{ lineHeight: 1.6 }}>{lesson.transcript}</Text>
                      {lesson.analysis && (
                        <div style={{ marginTop: 16, padding: 16, background: 'var(--bgColor-muted)', borderRadius: 8 }}>
                          <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>AI Analysis:</Text>
                          <LessonAnalysis analysis={lesson.analysis} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </Stack>
          <Translator />
        </Stack>
      </div>
    </main>
  )
}