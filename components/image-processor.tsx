'use client'

import { useState } from 'react'
import { Button, Stack, Text, Label } from '@primer/react'
import { ImageIcon, UploadIcon, CheckCircleIcon, XCircleIcon } from '@primer/octicons-react'

interface ImageProcessorProps {
  onImageProcessed?: (result: any) => void
  maxImages?: number
}

export function ImageProcessor({ onImageProcessed, maxImages = 5 }: ImageProcessorProps) {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

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

        return await response.json()
      })

      const processedResults = await Promise.all(uploadPromises)
      setResults(prev => [...prev, ...processedResults])
      
      if (onImageProcessed) {
        onImageProcessed(processedResults)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process images')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ border: 'var(--borderWidth-thin) solid var(--borderColor-default)', borderRadius: 12, padding: 24 }}>
      <Stack direction="vertical" gap="normal">
        <Stack direction="horizontal" align="center" gap="condensed">
          <ImageIcon size={24} />
          <Label variant="accent">Image Processing</Label>
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
        </Stack>

        {error && (
          <div style={{ color: 'var(--fgColor-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircleIcon />
            <Text>{error}</Text>
          </div>
        )}

        {results.length > 0 && (
          <Stack direction="vertical" gap="condensed">
            <Label variant="success">Processed Images</Label>
            {results.map((result, index) => (
              <div key={index} style={{ 
                background: 'var(--bgColor-muted)', 
                borderRadius: 8, 
                padding: 16,
                border: 'var(--borderWidth-thin) solid var(--borderColor-default)'
              }}>
                <Stack direction="horizontal" align="center" gap="condensed">
                  <span style={{ color: 'var(--fgColor-success)' }}>
                    <CheckCircleIcon />
                  </span>
                  <Text>Image {index + 1}</Text>
                  {result.size && (
                    <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>
                      {result.reduction ? `${result.reduction}% smaller` : `${(result.size / 1024).toFixed(1)} KB`}
                    </Text>
                  )}
                </Stack>
                {result.analysis && (
                  <div style={{ marginTop: 12 }}>
                    {typeof result.analysis === 'string' ? (
                      <div>
                        <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>
                          {result.fallback ? 'AI Analysis (Fallback):' : 'AI Analysis:'}
                        </Text>
                        <Text size="small" style={{ whiteSpace: 'pre-wrap' }}>
                          {result.analysis}
                        </Text>
                      </div>
                    ) : (
                      <div>
                        <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>
                          German Text:
                        </Text>
                        <Text size="small">{result.analysis.germanText || 'No German text detected'}</Text>
                        {result.analysis.translation && (
                          <>
                            <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8, marginTop: 8 }}>
                              Translation:
                            </Text>
                            <Text size="small">{result.analysis.translation}</Text>
                          </>
                        )}
                        {result.analysis.description && (
                          <>
                            <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8, marginTop: 8 }}>
                              Description:
                            </Text>
                            <Text size="small">{result.analysis.description}</Text>
                          </>
                        )}
                        {result.analysis.vocabulary && result.analysis.vocabulary.length > 0 && (
                          <>
                            <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8, marginTop: 8 }}>
                              Vocabulary:
                            </Text>
                            {result.analysis.vocabulary.map((vocab: any, vIndex: number) => (
                              <div key={vIndex} style={{ marginBottom: 4 }}>
                                <Text size="small" weight="semibold">{vocab.word}</Text>
                                <Text size="small"> - {vocab.translation}</Text>
                                {vocab.context && <Text size="small" style={{ color: 'var(--fgColor-muted)' }}> ({vocab.context})</Text>}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {result.rawAnalysis && (
                  <div style={{ marginTop: 12 }}>
                    <Text size="small" style={{ color: 'var(--fgColor-muted)', marginBottom: 8 }}>
                      Raw Analysis:
                    </Text>
                    <Text size="small" style={{ whiteSpace: 'pre-wrap' }}>
                      {result.rawAnalysis}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </Stack>
        )}
      </Stack>
    </div>
  )
}