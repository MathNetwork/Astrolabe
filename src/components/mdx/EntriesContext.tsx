'use client'

import { createContext } from 'react'

/**
 * Pre-loaded entry records, keyed by hash. When a view (e.g. ReadView) has
 * already fetched the whole store, it provides it here so each `\entryblock`
 * card renders synchronously from context instead of firing its own async
 * fetch — eliminating the placeholder→full-card reflow that made the page
 * drift while many cards loaded at staggered times.
 */
export const EntriesContext = createContext<Record<string, { record: string }> | undefined>(undefined)
