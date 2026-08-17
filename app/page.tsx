'use client'

import { useState } from 'react'
import { Button, Heading, Label, Link, Stack, Text, TextInput } from '@primer/react'
import { BookIcon, ChevronRightIcon, GraphIcon, UnmuteIcon, PlayIcon, SparkleFillIcon } from '@primer/octicons-react'
import { AuthGate, SignOutButton } from '@/components/auth-gate'

const lessons = [
  { title: 'At the bakery', level: 'A2', score: '87%', date: 'Today', duration: '08:42', color: 'accent' as const },
  { title: 'Making plans', level: 'B1', score: '91%', date: 'Yesterday', duration: '12:18', color: 'success' as const },
  { title: 'At the train station', level: 'A2', score: '78%', date: 'May 18', duration: '06:31', color: 'attention' as const },
]

export default function Page() {
  return <AuthGate><PageContent /></AuthGate>
}

function PageContent() {
  const [mode, setMode] = useState<'chooser' | 'teacher' | 'learner'>('chooser')
  const [recording, setRecording] = useState(false)
  const [lessonTitle, setLessonTitle] = useState('A conversation at the bakery')
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
        </Stack>
        <Stack direction="horizontal" gap="condensed" align="center" style={{ color: 'var(--fgColor-muted)' }}>
          <SparkleFillIcon size={16} /><Text size="small">Powered by NVIDIA NIM · Your audio is discarded after processing</Text>
        </Stack>
      </Stack>
    </main>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return <header style={{ borderBottom: 'var(--borderWidth-thin) solid var(--borderColor-muted)', padding: '18px 28px' }}><Stack direction="horizontal" align="center" justify="space-between" style={{ maxWidth: 1160, margin: '0 auto' }}><Link href="#" onClick={(e) => { e.preventDefault(); onBack() }} muted={false} style={{ fontWeight: 700, fontSize: 18 }}>DeutschFlow</Link><Stack direction="horizontal" gap="normal" align="center"><Text size="small" style={{ color: 'var(--fgColor-muted)' }}>German conversation practice</Text><Label variant="success">Beta</Label><SignOutButton /></Stack></Stack></header>
}

function ModeCard({ icon, label, title, description, action, onClick }: { icon: React.ReactNode; label: string; title: string; description: string; action: string; onClick: () => void }) {
  return <div style={{ flex: '1 1 340px', maxWidth: 480, border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 28, background: 'var(--bgColor-muted)', boxShadow: 'var(--shadow-floating-medium)' }}><Stack direction="vertical" gap="normal"><Stack direction="horizontal" align="center" justify="space-between"><span style={{ color: 'var(--fgColor-accent)' }}>{icon}</span><Label variant="secondary">{label}</Label></Stack><Heading as="h2" variant="medium">{title}</Heading><Text style={{ color: 'var(--fgColor-muted)', minHeight: 48 }}>{description}</Text><Button variant="primary" trailingAction={ChevronRightIcon} onClick={onClick}>{action}</Button></Stack></div>
}

function TeacherMode({ recording, setRecording, lessonTitle, setLessonTitle, status, setStatus, onBack }: { recording: boolean; setRecording: (value: boolean) => void; lessonTitle: string; setLessonTitle: (value: string) => void; status: string; setStatus: (value: string) => void; onBack: () => void }) {
  return <main style={{ minHeight: '100vh' }}><Header onBack={onBack} /><div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}><Stack direction="vertical" gap="spacious"><Stack direction="horizontal" justify="space-between" align="end"><Stack direction="vertical" gap="condensed"><Label variant="accent">Teacher Mode</Label><Heading as="h1" variant="large">Record a lesson</Heading><Text style={{ color: 'var(--fgColor-muted)' }}>Speak naturally. DeutschFlow will listen for the moments that help learners grow.</Text></Stack><Button onClick={onBack}>Change mode</Button></Stack><div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(300px, .9fr)', gap: 24 }}><section style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 28, background: 'var(--bgColor-muted)' }}><Stack direction="vertical" gap="normal"><TextInput aria-label="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} /><div style={{ minHeight: 260, border: 'var(--borderWidth-thin) solid var(--borderColor-muted)', borderRadius: 8, padding: 20, background: 'var(--bgColor-default)' }}><Stack direction="vertical" gap="normal"><Stack direction="horizontal" gap="condensed" align="center"><span style={{ color: recording ? 'var(--fgColor-open)' : 'var(--fgColor-muted)' }}><UnmuteIcon /></span><Text weight="semibold">Live transcript</Text><Label variant={recording ? 'attention' : 'secondary'}>{recording ? 'Listening' : 'Waiting'}</Label></Stack><Text style={{ color: 'var(--fgColor-muted)', lineHeight: 1.7 }}>{recording ? 'Ich möchte heute über meine Reise nach Berlin sprechen...' : 'Your transcript will appear here as the conversation unfolds.'}</Text></Stack></div><Stack direction="horizontal" justify="space-between" align="center"><Text size="small" style={{ color: 'var(--fgColor-muted)' }}>{status}</Text><Button variant="primary" leadingVisual={<UnmuteIcon />} onClick={() => { setRecording(!recording); setStatus(recording ? 'Recording saved for analysis' : 'Microphone is active') }}>{recording ? 'Stop recording' : 'Start recording'}</Button></Stack></Stack></section><section style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 28 }}><Stack direction="vertical" gap="normal"><Heading as="h2" variant="small">Lesson setup</Heading><Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Choose a level so feedback stays useful and encouraging.</Text><Stack direction="horizontal" gap="condensed"><Label variant="accent">A2</Label><Label variant="secondary">B1</Label><Label variant="secondary">B2</Label></Stack><hr style={{ width: '100%', border: 0, borderTop: 'var(--borderWidth-thin) solid var(--borderColor-muted)' }} /><Stack direction="horizontal" gap="condensed" align="center"><GraphIcon size={16} /><Text size="small">AI analysis includes corrections, vocabulary, and next steps.</Text></Stack></Stack></section></div></Stack></div></main>
}

function LearnerMode({ onBack }: { onBack: () => void }) {
  return <main style={{ minHeight: '100vh' }}><Header onBack={onBack} /><div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}><Stack direction="vertical" gap="spacious"><Stack direction="horizontal" justify="space-between" align="end"><Stack direction="vertical" gap="condensed"><Label variant="accent">Learner Mode</Label><Heading as="h1" variant="large">Your learning space</Heading><Text style={{ color: 'var(--fgColor-muted)' }}>Small conversations become confident habits.</Text></Stack><Button onClick={onBack}>Change mode</Button></Stack><Stack direction="horizontal" gap="normal" style={{ flexWrap: 'wrap' }}><div style={{ flex: '1 1 220px', border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}><Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Average accuracy</Text><Heading as="h2" variant="large">86%</Heading><Text size="small" style={{ color: 'var(--fgColor-success)' }}>+8% this month</Text></div><div style={{ flex: '1 1 220px', border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}><Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Lessons completed</Text><Heading as="h2" variant="large">12</Heading><Text size="small">Keep your streak going</Text></div></Stack><Stack direction="vertical" gap="normal"><Heading as="h2" variant="medium">Saved lessons</Heading>{lessons.map((lesson) => <div key={lesson.title} style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 20 }}><Stack direction="horizontal" justify="space-between" align="center"><Stack direction="horizontal" gap="normal" align="center"><span style={{ color: 'var(--fgColor-accent)' }}><PlayIcon size={20} /></span><Stack direction="vertical" gap="condensed"><Text weight="semibold">{lesson.title}</Text><Text size="small" style={{ color: 'var(--fgColor-muted)' }}>{lesson.level} · {lesson.duration} · {lesson.date}</Text></Stack></Stack><Stack direction="horizontal" gap="normal" align="center"><Label variant={lesson.color}>{lesson.score}</Label><Button variant="invisible">Review</Button></Stack></Stack></div>)}</Stack></Stack></div></main>
}
