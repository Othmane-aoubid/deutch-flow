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
import { transcribeInBrowser } from '@/lib/whisper'

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

/** Encode mono Float32 samples as a 16-bit PCM WAV file. */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

/** Meter a live stream's RMS level for a short window (mic auto-probe). */
async function meterStreamRms(stream: MediaStream, ms: number): Promise<number> {
  const AudioCtx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    const src = ctx.createMediaStreamSource(stream)
    const proc = ctx.createScriptProcessor(4096, 1, 1)
    let sum = 0
    let n = 0
    proc.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0)
      for (let i = 0; i < d.length; i++) sum += d[i] * d[i]
      n += d.length
    }
    src.connect(proc)
    proc.connect(ctx.destination)
    await new Promise((r) => setTimeout(r, ms))
    proc.disconnect()
    src.disconnect()
    return n ? Math.sqrt(sum / n) : 0
  } finally {
    void ctx.close()
  }
}

function TeacherMode({ recording, setRecording, lessonTitle, setLessonTitle, status, setStatus, onBack }: { recording: boolean; setRecording: (value: boolean) => void; lessonTitle: string; setLessonTitle: (value: string) => void; status: string; setStatus: (value: string) => void; onBack: () => void }) {
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [level, setLevel] = useState('A2')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [liveCaption, setLiveCaption] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)
  const recognitionRef = useRef<any>(null)
  const browserTranscriptRef = useRef('')
  // Microphone selection: 'auto' probes every device briefly at record start
  // and picks the one with real signal; a specific deviceId pins the choice.
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [micId, setMicId] = useState(() => {
    // Remembered choice from a previous session (default: auto).
    if (typeof window === 'undefined') return 'auto'
    try { return window.localStorage.getItem('df:micId') || 'auto' } catch { return 'auto' }
  })
  const [inputLevel, setInputLevel] = useState(0) // 0..1 live mic level for the meter
  // undefined = not probed yet · null = probed, nothing beat default · string = chosen device
  const autoMicRef = useRef<string | null | undefined>(undefined)

  const refreshMics = async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices()
      setMics(devs.filter((d) => d.kind === 'audioinput'))
    } catch {}
  }

  useEffect(() => {
    let cancelled = false
    // Labels are only visible after mic permission; open the default mic
    // briefly once so the dropdown can show real device names.
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        s.getTracks().forEach((t) => t.stop())
        if (!cancelled) await refreshMics()
      } catch {}
    })()
    const onChange = () => {
      autoMicRef.current = undefined // devices changed → re-probe next record
      refreshMics()
    }
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange)
    return () => {
      cancelled = true
      navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
    }
  }, [])

  // Persist the mic choice across reloads.
  useEffect(() => {
    try {
      if (micId === 'auto') window.localStorage.removeItem('df:micId')
      else window.localStorage.setItem('df:micId', micId)
    } catch {}
  }, [micId])

  // Probe every real input device (~0.5 s each) and return the id with the
  // strongest RMS — or null when nothing beats the OS default.
  const probeBestMic = async (): Promise<string | null> => {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
    // 'default'/'communications' are aliases — probing the real devices covers them.
    const candidates = devs.filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
    let best: { id: string; rms: number } | null = null
    for (const dev of candidates) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: dev.deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        })
        const rms = await meterStreamRms(stream, 500)
        stream.getTracks().forEach((t) => t.stop())
        if (!best || rms > best.rms) best = { id: dev.deviceId, rms }
      } catch {}
    }
    // Floor: below this the "winner" is itself silent — prefer default anyway.
    // (0.0005 sits above digital-silence/idle noise but far below real speech;
    // observed idle mics read ~0.0003, the working array ~0.003 when quiet.)
    return best && best.rms > 0.0005 ? best.id : null
  }
  // Live transcription: the mic is tapped at 16 kHz, cut into ~3 s chunks and
  // sent to the server Whisper WHILE recording, so text appears on the spot.
  const pendingLiveRef = useRef<Float32Array[]>([]) // samples not yet dispatched
  const liveTextRef = useRef('')                    // finalized live transcript
  const liveQueueRef = useRef<Promise<void>>(Promise.resolve()) // serialize jobs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const flushLiveChunk = (force = false) => {
    const rate = audioCtxRef.current?.sampleRate ?? 16000
    const buffered = pendingLiveRef.current.reduce((n, a) => n + a.length, 0)
    if (!force && buffered < rate * 3) return
    if (buffered < rate * 0.6) return // too short to be worth a round-trip
    const merged = new Float32Array(buffered)
    let offset = 0
    for (const part of pendingLiveRef.current) {
      merged.set(part, offset)
      offset += part.length
    }
    pendingLiveRef.current = []
    const wav = encodeWav(merged, rate)
    // Serialize jobs so chunks are appended in chronological order.
    liveQueueRef.current = liveQueueRef.current.then(async () => {
      try {
        const form = new FormData()
        form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'chunk.wav')
        const res = await apiFetch('/api/asr', { method: 'POST', body: form })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        const text = (Array.isArray(data.segments) ? data.segments : []).map((s: any) => s.text).join(' ').trim()
        if (!text) return
        liveTextRef.current = liveTextRef.current ? `${liveTextRef.current} ${text}` : text
        setTranscript(liveTextRef.current)
      } catch {
        // A dropped chunk must not kill the live stream; the stop-time path recovers.
      }
    })
  }

  const startRecording = async () => {
    try {
      // Mic selection: a pinned device wins; 'auto' probes all devices once
      // per session (cached) and falls back to the OS default on silence.
      let constraints: MediaTrackConstraints = { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      if (micId !== 'auto') {
        try {
          // Verify the remembered device still exists (else getUserMedia fails).
          const test = await navigator.mediaDevices.getUserMedia({ audio: { ...constraints, deviceId: { exact: micId } } })
          test.getTracks().forEach((t) => t.stop())
          constraints = { ...constraints, deviceId: { exact: micId } }
        } catch {
          // Remembered device is gone (unplugged) — fall back gracefully.
          setMicId('auto')
          autoMicRef.current = undefined
        }
      }
      if (micId === 'auto' || autoMicRef.current) {
        setStatus('Checking microphones…')
        if (autoMicRef.current === undefined) autoMicRef.current = await probeBestMic()
        if (autoMicRef.current) {
          constraints = { ...constraints, deviceId: { exact: autoMicRef.current } }
          const label = mics.find((m) => m.deviceId === autoMicRef.current)?.label
          if (label) setStatus(`Using ${label}`)
        }
      }
      // Raw mic audio: browser processing filters can mangle word onsets for Whisper.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        setAudioChunks(chunks)
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const duration = formatDuration(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))

        // Tear down the live tap, flush any remaining samples, and let the
        // last in-flight chunk job finish before continuing.
        try { processorRef.current?.disconnect(); sourceRef.current?.disconnect(); await audioCtxRef.current?.close() } catch {}
        processorRef.current = null; sourceRef.current = null; audioCtxRef.current = null
        setInputLevel(0)
        flushLiveChunk(true)
        await liveQueueRef.current.catch(() => {})

        // Full chain, in order: live server chunks → Web Speech finals
        // captured while recording → full-file server pass → in-browser Whisper.
        let fullTranscript = liveTextRef.current || browserTranscriptRef.current
        if (!fullTranscript) {
          setStatus('Transcribing...')
          const formData = new FormData()
          formData.append('audio', audioBlob)
          try {
            const asrResponse = await apiFetch('/api/asr', { method: 'POST', body: formData })
            const asrResult = await asrResponse.json().catch(() => ({}))
            const serverTranscript = asrResponse.ok && Array.isArray(asrResult.segments)
              ? asrResult.segments.map((s: any) => s.text).join(' ')
              : ''
            if (serverTranscript) fullTranscript = serverTranscript
          } catch {}
        }
        if (!fullTranscript) {
          const whisper = await transcribeInBrowser(audioBlob, (message) => setStatus(message))
          if (whisper?.text) fullTranscript = whisper.text
        }
        if (!fullTranscript) {
          setStatus('No speech detected in the recording')
          stream.getTracks().forEach(track => track.stop())
          return
        }
        setTranscript(fullTranscript)
        setStatus('Analyzing transcript...')

        try {
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
        } catch (error) {
          setStatus('Processing failed')
        }

        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setRecording(true)
      setRecordingSeconds(0)
      setTranscript('')
      setLiveCaption('')
      liveTextRef.current = ''
      browserTranscriptRef.current = ''
      pendingLiveRef.current = []
      liveQueueRef.current = Promise.resolve()
      setAnalysis(null)
      startedAtRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 1000)
      // Live transcription tap: pull raw PCM from the mic, accumulate ~3 s
      // chunks, and send each to the server Whisper while recording continues.
      try {
        const AudioCtx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioCtx()
        const source = ctx.createMediaStreamSource(stream)
        const processor = ctx.createScriptProcessor(4096, 1, 1)
        processor.onaudioprocess = (e) => {
          const data = new Float32Array(e.inputBuffer.getChannelData(0))
          pendingLiveRef.current.push(data)
          // Live input meter: RMS scaled so normal speech sits mid-bar.
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
          const rms = Math.sqrt(sum / data.length)
          setInputLevel(Math.min(1, rms * 4))
          flushLiveChunk()
        }
        source.connect(processor)
        processor.connect(ctx.destination)
        audioCtxRef.current = ctx
        sourceRef.current = source
        processorRef.current = processor
      } catch {
        // Tap unavailable — stop-time full-file transcription still covers it.
      }
      // Live captions while recording (Web Speech API — Chrome/Edge). Gives
      // instant word-by-word text when the browser supports it; the server
      // chunk stream above is the provider-independent live layer.
      const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SRClass) {
        try {
          const recognition = new SRClass()
          recognition.lang = 'de-DE'
          recognition.continuous = true
          recognition.interimResults = true
          recognition.onresult = (event: any) => {
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                const final = event.results[i][0].transcript.trim()
                // Server chunks own the transcript once they arrive; until
                // then Web Speech finals provide the instant live view.
                if (!liveTextRef.current) {
                  browserTranscriptRef.current = browserTranscriptRef.current ? `${browserTranscriptRef.current} ${final}` : final
                  setTranscript(browserTranscriptRef.current)
                }
              } else {
                interim += event.results[i][0].transcript
              }
            }
            setLiveCaption(interim)
          }
          recognition.onerror = () => setLiveCaption('')
          recognition.onend = () => setLiveCaption('')
          recognition.start()
          recognitionRef.current = recognition
        } catch {
          recognitionRef.current = null
        }
      }
      setStatus('Recording started — transcript appears live')
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
      recognitionRef.current?.stop?.()
      recognitionRef.current = null
      setStatus('Finishing transcription…')
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
          {/* Responsive: collapse to one column on narrow screens — otherwise the
              right column overlaps and swallows clicks on the Stop button. */}
          <style>{`@media (max-width: 900px) { .df-teacher-grid { grid-template-columns: 1fr !important; } }
  .df-teacher-grid > * { min-width: 0; }
  .df-teacher-grid select { min-width: 0; max-width: 100%; }`}</style>
          <div className="df-teacher-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(300px, .9fr)', gap: 24 }}>
            <section style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 28, background: 'var(--bgColor-muted)' }}>
              <Stack direction="vertical" gap="normal">
                <Stack direction="horizontal" gap="condensed">
                  <TextInput aria-label="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} style={{ flex: 1 }} />
                  <select aria-label="CEFR level" value={level} onChange={(e) => setLevel(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: 'var(--borderWidth-thin) solid var(--borderColor-default)', background: 'var(--bgColor-default)', color: 'var(--fgColor-default)' }}>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Stack>
                <Stack direction="horizontal" gap="condensed" align="center">
                  <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Microphone</Text>
                  <select
                    aria-label="Microphone"
                    value={micId}
                    onChange={(e) => {
                      setMicId(e.target.value)
                      if (e.target.value !== 'auto') autoMicRef.current = null // explicit choice beats auto
                      else autoMicRef.current = undefined // re-arm auto probing
                    }}
                    style={{ flex: 1, minWidth: 0, width: '100%', padding: '6px 10px', borderRadius: 6, border: 'var(--borderWidth-thin) solid var(--borderColor-default)', background: 'var(--bgColor-default)', color: 'var(--fgColor-default)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    <option value="auto">Auto — best signal</option>
                    {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || `Microphone ${m.deviceId.slice(0, 8)}`}</option>)}
                  </select>
                </Stack>
                <div style={{ minHeight: 260, border: 'var(--borderWidth-thin) solid var(--borderColor-muted)', borderRadius: 8, padding: 20, background: 'var(--bgColor-default)' }}>
                  <Stack direction="vertical" gap="normal">
                    <Stack direction="horizontal" gap="condensed" align="center">
                      <span style={{ color: recording ? 'var(--fgColor-open)' : 'var(--fgColor-muted)' }}><UnmuteIcon /></span>
                      <Text weight="semibold">Live transcript</Text>
                      <Label variant={recording ? 'attention' : 'secondary'}>{recording ? 'Listening' : 'Waiting'}</Label>
                      <Stack direction="horizontal" gap="condensed" align="center" style={{ marginLeft: 'auto' }}>
                        <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>Mic</Text>
                        <div aria-label="Input level" style={{ width: 120, height: 8, borderRadius: 4, background: 'var(--borderColor-muted)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round(inputLevel * 100)}%`, height: '100%', transition: 'width 90ms linear', background: inputLevel > 0.75 ? 'var(--fgColor-attention)' : 'var(--fgColor-success)' }} />
                        </div>
                      </Stack>
                    </Stack>
                    <Text style={{ color: 'var(--fgColor-muted)', lineHeight: 1.7 }}>
                      {transcript || liveCaption
                        ? `${transcript}${transcript && liveCaption ? ' ' : ''}${liveCaption}`
                        : recording
                          ? 'Listening — text appears here live as you speak…'
                          : 'Your transcript will appear here as the conversation unfolds.'}
                    </Text>
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