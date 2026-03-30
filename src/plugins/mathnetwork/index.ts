import type { AstrolabePlugin } from '../types'
import { DetailEdges } from './DetailEdges'

export const mathNetworkPlugin: AstrolabePlugin = {
    id: 'mathnetwork',
    name: 'MathNetwork',
    description: 'Transform entries into a directed network for analysis.',
    DetailSection: DetailEdges,
}
