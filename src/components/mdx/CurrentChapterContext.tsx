'use client'

import { createContext } from 'react'

/**
 * The chapter number of the doc currently being rendered. A cross-source
 * `\entryref` compares it against the target card's chapter so it can append
 * "of Chapter C" exactly when the reference crosses a chapter boundary (do
 * Carmo's convention), without that phrasing being baked into the text.
 */
export const CurrentChapterContext = createContext<number | undefined>(undefined)
