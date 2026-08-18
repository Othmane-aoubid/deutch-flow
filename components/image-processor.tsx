'use client'

import { useState, useEffect } from 'react'
import { Button, Stack, Text, Label, Heading } from '@primer/react'
import { ImageIcon, UploadIcon, CheckCircleIcon, XCircleIcon, PlayIcon, TrashIcon } from '@primer/octicons-react'
import { ExerciseMode } from './exercise-mode'
import { useRouter } from 'next/navigation'
import { firebaseAuth } from '@/lib/firebase'

interface ImageProcessorProps {
  onImageProcessed?: (result: any) => void
  maxImages?: number
}

export function ImageProcessor({ onImageProcessed, maxImages = 5 }: ImageProcessorProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showExercises, setShowExercises] = useState(false)

  useEffect(() => {
    loadSavedAnalyses()
  }, [])

  const loadSavedAnalyses = async () => {
    try {
      if (!firebaseAuth) return
      const user = firebaseAuth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` }
      const response = await fetch('/api/image-analysis', { headers })
      const data = await response.json()
      if (data.analyses) {
        setResults(data.analyses.map((analysis: any) => ({ success: true, analysis })))
      }
    } catch (error) {
      console.error('Failed to load saved analyses:', error)
    }
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const uploadPromises = Array.from(files).slice(0, maxImages).map(async (file) => {
        const formData = new FormData()
        formData.append('image', file)
        formData.append('action', 'analyze')

        const response = await fetch('/api/images', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to process ${file.name}`)
        }

        const result = await response.json()
        
        // Save analysis to Firestore
        if (result.success && result.analysis) {
          try {
            await fetch('/api/image-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result.analysis)
            })
            
            // Save vocabulary to Firestore
            if (result.analysis.vocabulary && Array.isArray(result.analysis.vocabulary)) {
              for (const vocab of result.analysis.vocabulary) {
                await fetch('/api/vocabulary', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    german: vocab.german || vocab.word,
                    english: vocab.english || vocab.translation,
                    type: vocab.type,
                    context: vocab.context,
                    source: 'image'
                  })
                })
              }
            }
          } catch (saveError) {
            console.error('Failed to save to Firestore:', saveError)
          }
        }
        
        return result
      })

      const processedResults = await Promise.all(uploadPromises)
      setResults(prev => [...prev, ...processedResults])
      
      if (onImageProcessed) {
        onImageProcessed(processedResults)
      }

      // Redirect to dedicated page after successful upload
      if (processedResults.length > 0) {
        router.push('/image-analyses')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process images')
    } finally {
      setUploading(false)
    }
  }

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'de-DE'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const saveAnalysis = async (analysis: any) => {
    try {
      if (!firebaseAuth) return
      const user = firebaseAuth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      await fetch('/api/image-analysis', {
        method: 'POST',
        headers,
        body: JSON.stringify(analysis)
      })
    } catch (error) {
      console.error('Failed to save analysis:', error)
    }
  }

  const deleteResult = (index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index))
  }

  const parseAnalysis = (analysis: any) => {
    if (typeof analysis === 'string') {
      try {
        return JSON.parse(analysis)
      } catch {
        return null
      }
    }
    return analysis
  }

  const getAllVocabulary = () => {
    const allVocab: any[] = []
    results.forEach(result => {
      const analysis = parseAnalysis(result.analysis)
      if (analysis?.vocabulary) {
        allVocab.push(...analysis.vocabulary)
      }
    })
    return allVocab
  }

  return (
    <div style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
      <Stack direction="vertical" gap="normal">
        <Stack direction="horizontal" align="center" justify="space-between">
          <Stack direction="horizontal" align="center" gap="condensed">
            <ImageIcon size={24} />
            <Label variant="accent">Image Processing</Label>
          </Stack>
        </Stack>
        
        <Text style={{ color: 'var(--fgColor-muted)' }}>
          Upload images for German learning content analysis using AI.
        </Text>

        <Stack direction="horizontal" gap="condensed">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleImageUpload(e.target.files)}
            disabled={uploading}
            style={{ display: 'none' }}
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button as="span" disabled={uploading} leadingVisual={UploadIcon}>
              {uploading ? 'Processing...' : 'Upload Images'}
            </Button>
          </label>
          <Button 
            variant="default"
            onClick={() => router.push('/image-analyses')}
          >
            View All Analyses
          </Button>
          {getAllVocabulary().length > 0 && (
            <Button 
              variant={showExercises ? 'primary' : 'default'}
              onClick={() => setShowExercises(!showExercises)}
            >
              {showExercises ? 'View Results' : 'Practice Mode'}
            </Button>
          )}
        </Stack>

        {error && (
          <div style={{ color: 'var(--fgColor-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircleIcon />
            <Text>{error}</Text>
          </div>
        )}

        {results.length > 0 && (
          <Stack direction="vertical" gap="normal">
            {showExercises ? (
              <ExerciseMode vocabulary={getAllVocabulary()} />
            ) : (
              <>
                <Label variant="success">Processed Images</Label>
                {results.map((result, index) => {
                  const analysis = parseAnalysis(result.analysis)
                  if (!analysis) return null

                  return (
                    <div key={index} style={{ 
                      background: 'var(--bgColor-muted)', 
                      borderRadius: 12, 
                      padding: 20,
                      border: 'var(--borderWidth-thin) solid var(--borderColor-default)'
                    }}>
                      <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 16 }}>
                        <Stack direction="horizontal" align="center" gap="condensed">
                          <span style={{ color: 'var(--fgColor-success)' }}>
                            <CheckCircleIcon />
                          </span>
                          <Text weight="semibold">Image {index + 1}</Text>
                          {analysis.learningLevel && (
                            <Label variant="secondary">{analysis.learningLevel}</Label>
                          )}
                        </Stack>
                        <Stack direction="horizontal" gap="condensed">
                          <Button 
                            variant="default" 
                            size="small"
                            onClick={() => saveAnalysis(analysis)}
                          >
                            Save
                          </Button>
                          <Button 
                            variant="danger" 
                            size="small" 
                            leadingVisual={TrashIcon}
                            onClick={() => deleteResult(index)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>

                      {analysis.germanText && (
                        <div style={{ marginBottom: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                          <Stack direction="horizontal" justify="space-between" align="center" style={{ marginBottom: 8 }}>
                            <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>German Text:</Text>
                            <Button 
                              variant="default" 
                              size="small" 
                              leadingVisual={PlayIcon}
                              onClick={() => speakText(analysis.germanText)}
                            >
                              Listen
                            </Button>
                          </Stack>
                          <Text style={{ fontSize: 16, lineHeight: 1.6 }}>{analysis.germanText}</Text>
                        </div>
                      )}

                      {analysis.translation && (
                        <div style={{ marginBottom: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                          <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>Translation:</Text>
                          <Text style={{ fontSize: 14, lineHeight: 1.6 }}>{analysis.translation}</Text>
                        </div>
                      )}

                      {analysis.description && (
                        <div style={{ marginBottom: 16, padding: 16, background: 'var(--bgColor-default)', borderRadius: 8 }}>
                          <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>Description:</Text>
                          <Text size="small">{analysis.description}</Text>
                        </div>
                      )}

                      {analysis.vocabulary && analysis.vocabulary.length > 0 && (
                        <div>
                          <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 12 }}>Vocabulary:</Text>
                          <Stack direction="vertical" gap="condensed">
                            {analysis.vocabulary.map((vocab: any, vIndex: number) => (
                              <div key={vIndex} style={{ 
                                padding: 12, 
                                background: 'var(--bgColor-default)', 
                                borderRadius: 8,
                                border: 'var(--borderWidth-thin) solid var(--borderColor-muted)'
                              }}>
                                <Stack direction="horizontal" justify="space-between" align="center">
                                  <Stack direction="vertical" gap="condensed">
                                    <Text weight="semibold" style={{ fontSize: 16 }}>{vocab.german || vocab.word}</Text>
                                    <Text size="small">{vocab.english || vocab.translation}</Text>
                                    {vocab.type && (
                                      <Label variant="secondary" size="small">{vocab.type}</Label>
                                    )}
                                  </Stack>
                                  <Button 
                                    variant="default" 
                                    size="small" 
                                    leadingVisual={PlayIcon}
                                    onClick={() => speakText(vocab.german || vocab.word)}
                                  >
                                    Listen
                                  </Button>
                                </Stack>
                              </div>
                            ))}
                          </Stack>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </Stack>
        )}
      </Stack>
    </div>
  )
}