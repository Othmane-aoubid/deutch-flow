# DeutschFlow

A calm, intelligent practice space for German teachers and learners. Capture real conversations, understand every correction, and keep moving forward.

## Features

- **Teacher Mode**: Record classroom conversations with live transcription and AI-powered feedback
- **Learner Mode**: Review saved lessons, practice corrections, and build lasting fluency
- **Image Processing**: Upload images for German learning content analysis and optimization
- **Authentication**: Sign in with Email/Password or Google

## Tech Stack

- Next.js 16 with App Router
- Firebase Authentication
- Primer React (GitHub's design system)
- NVIDIA NIM for AI processing
- Gemini API for additional AI features

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Firebase project with Authentication enabled
- NVIDIA API key
- Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Othmane-aoubid/deutch-flow.git
cd deutch-flow
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Enable Authentication:
     - Go to Build → Authentication → Sign-in method
     - Enable "Email/Password" provider
     - Enable "Google" provider
   - Get your web app configuration:
     - Go to Project Settings → Your apps → Web app
     - Copy the firebaseConfig values
   - For Admin SDK (optional, for server-side operations):
     - Go to Project Settings → Service accounts
     - Generate a new private key
     - Save the JSON content

5. Add the following environment variables to your `.env` file:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin Configuration (optional, for server-side operations)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# NVIDIA API Configuration
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_API_KEY_FALLBACK=your_nvidia_fallback_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_LLM_MODEL=meta/muse-glimmer-30b
NVIDIA_LLM_MODEL_FALLBACK=nvidia/nemotron-3-ultra-550b-a55b

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com/new)
3. Add the following environment variables in Vercel project settings:

#### Required Environment Variables for Vercel

**Firebase Client Configuration:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Firebase Admin Configuration (optional):**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (Make sure to properly escape newlines with `\n`)

**NVIDIA API Configuration:**
- `NVIDIA_API_KEY`
- `NVIDIA_API_KEY_FALLBACK`
- `NVIDIA_BASE_URL`
- `NVIDIA_LLM_MODEL`
- `NVIDIA_LLM_MODEL_FALLBACK`

**Gemini API Configuration:**
- `GEMINI_API_KEY`

4. Deploy!

## Project Structure

```
deutsch-flow/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth-gate.tsx      # Authentication wrapper
│   ├── image-processor.tsx # Image processing component
│   └── showcase/          # Showcase components
├── lib/                   # Utility libraries
│   ├── firebase.ts        # Firebase client config
│   ├── firebase-admin.ts  # Firebase admin config
│   └── gemini.ts          # Gemini API client
└── scripts/               # Setup scripts
```

## License

MIT
