import { loadStore } from '@/lib/server/store'
import { buildSkeletonView } from '@/lib/server/skeleton'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectPath = searchParams.get('path')
  if (!projectPath) return Response.json({ detail: 'path required' }, { status: 400 })

  const view = buildSkeletonView(loadStore(projectPath), {
    source: searchParams.get('source') ?? 'all',
    size: searchParams.get('size') ?? 'uniform',
    color: searchParams.get('color') ?? 'sort',
    cluster: searchParams.get('cluster') ?? 'none',
  })
  return Response.json(view)
}
