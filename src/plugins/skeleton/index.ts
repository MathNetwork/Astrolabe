import type { AstrolabePlugin } from '../types'
import { DetailEdges } from './DetailEdges'

export const skeletonPlugin: AstrolabePlugin = {
    id: 'skeleton',
    name: '1-Skeleton View',
    description: 'Collapse degree-1 entries into directed edges between atoms.',
    DetailSection: DetailEdges,
}
