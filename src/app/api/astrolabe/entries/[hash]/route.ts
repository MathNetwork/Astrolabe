import { loadStore } from '@/lib/server/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  const { searchParams } = new URL(req.url)
  const projectPath = searchParams.get('path')
  if (!projectPath) return Response.json({ detail: 'path required' }, { status: 400 })

  const entry = loadStore(projectPath)[hash]
  if (!entry) return Response.json({ detail: 'Not found' }, { status: 404 })
  return Response.json(entry)
}
