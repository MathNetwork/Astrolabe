import { redirect } from 'next/navigation'

// Astrolabe has no homepage: it is a tool that web pages invoke on a store
// (`/local/edit?path=…`). The root redirects into the workspace on the
// default project — the bundled self-documentation unless the deployment
// points NEXT_PUBLIC_PROJECT_PATH at real data.
const DEFAULT_PROJECT = process.env.NEXT_PUBLIC_PROJECT_PATH || 'projects/docs'

export default function Home() {
  redirect(`/local/edit?path=${encodeURIComponent(DEFAULT_PROJECT)}`)
}
