import type { AstrolabePlugin } from '../types'
import { DetailEdges } from './DetailEdges'
import { RecordRenderer } from './RecordRenderer'
import { LeanNetsSettings } from './SettingsPanel'

export const leanNetsPlugin: AstrolabePlugin = {
    id: 'leannets',
    name: 'LeanNets',
    description: 'Transform entries into a directed network for analysis.',
    DetailSection: DetailEdges,
    RecordRenderer: RecordRenderer,
    networkMode: {
        label: 'NETWORK',
        endpoint: '/api/plugins/leannets/graph',
    },
    SettingsPanel: LeanNetsSettings,
}
