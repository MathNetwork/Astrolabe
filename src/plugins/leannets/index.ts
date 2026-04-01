import type { AstrolabePlugin } from '../types'
import { DetailEdges } from './DetailEdges'
import { RecordRenderer } from './RecordRenderer'
import { LeanNetsSettings } from './SettingsPanel'
import { LeanNetsEntryBlock } from './EntryBlockRenderer'
import { LeanNetsEntryRef } from './EntryRefRenderer'

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
    EntryBlockRenderer: LeanNetsEntryBlock,
    EntryRefRenderer: LeanNetsEntryRef,
}
