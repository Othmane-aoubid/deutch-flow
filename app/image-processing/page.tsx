'use client'

import { Button, Heading, Label, Stack, Text } from '@primer/react'
import { ArrowLeftIcon } from '@primer/octicons-react'
import { useRouter } from 'next/navigation'
import { ImageProcessor } from '@/components/image-processor'

export default function ImageProcessingPage() {
  const router = useRouter()

  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px 80px' }}>
        <Stack direction="vertical" gap="spacious">
          <Stack direction="horizontal" gap="normal" align="center">
            <Button onClick={() => router.back()} leadingVisual={ArrowLeftIcon}>
              Back
            </Button>
            <Heading as="h1" variant="large">Image Processing</Heading>
          </Stack>

          <Stack direction="vertical" gap="condensed">
            <Label variant="accent">AI-Powered Learning</Label>
            <Text style={{ color: 'var(--fgColor-muted)', maxWidth: 600 }}>
              Upload images for German learning content analysis using AI. Extract vocabulary, translations, and descriptions from visual content to build your German language skills.
            </Text>
          </Stack>

          <ImageProcessor />
        </Stack>
      </div>
    </main>
  )
}
