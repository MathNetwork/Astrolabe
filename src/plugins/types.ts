import type { ReactNode } from 'react'

export interface AstrolabePlugin {
    id: string
    name: string
    description: string

    /** Transform network graph data (nodes + links) when enabled. */
    transformGraph?: (data: { nodes: any[]; links: any[] }) => { nodes: any[]; links: any[] }

    /** Additional section rendered in DetailView when an entry is selected. */
    DetailSection?: React.FC<{ entryId: string }>
}
