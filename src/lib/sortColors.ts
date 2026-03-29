import type React from 'react'

/**
 * Shared color system for astrolabe entries.
 *
 * Colors are auto-assigned from sort strings using a deterministic hash → HSL mapping.
 * Same sort → same color, any number of sorts supported.
 * Derived sorts "(a, b)" blend the two atomic sort colors.
 *
 * Used by both NetworkView (nodes/edges) and MarkdownRenderer (EntryBlock).
 */

// ── Deterministic sort → color ──

const _colorCache: Record<string, string> = {}

/** Deterministic hash of a string to a number. */
function hashStr(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0
    }
    return Math.abs(h)
}

/** Generate a visually distinct HSL color from a sort string. */
function autoColor(sort: string): string {
    if (_colorCache[sort]) return _colorCache[sort]
    const h = hashStr(sort)
    const hue = h % 360
    const sat = 50 + (h >> 8) % 30      // 50-80%
    const lit = 45 + (h >> 16) % 20     // 45-65%
    const color = `hsl(${hue}, ${sat}%, ${lit}%)`
    _colorCache[sort] = color
    return color
}

/** HSL string to [r, g, b]. */
function hslToRgb(hsl: string): [number, number, number] {
    const m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!m) return [136, 136, 136]
    const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
    return [Math.round(hue2rgb(p, q, h + 1/3) * 255), Math.round(hue2rgb(p, q, h) * 255), Math.round(hue2rgb(p, q, h - 1/3) * 255)]
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

/** Get the hex fill color for any sort string. */
function sortToHex(sort: string): string {
    const hsl = autoColor(sort)
    const [r, g, b] = hslToRgb(hsl)
    return rgbToHex(r, g, b)
}

// ── Public API ──

/** Get canvas fill color for any sort (atomic or derived). */
export function getSortFill(sort: string): string {
    // Derived sort "(sortA, sortB)" → blend
    const m = sort.match(/^\((.+),\s*(.+)\)$/)
    if (m) {
        const a = hslToRgb(autoColor(m[1]))
        const b = hslToRgb(autoColor(m[2]))
        return rgbToHex(
            Math.round((a[0] + b[0]) / 2),
            Math.round((a[1] + b[1]) / 2),
            Math.round((a[2] + b[2]) / 2),
        )
    }
    return sortToHex(sort)
}

/** Get inline styles for EntryBlock rendering. */
export function getSortStyle(sort: string): { fill: string; borderStyle: React.CSSProperties; textStyle: React.CSSProperties } {
    const fill = getSortFill(sort)
    return {
        fill,
        borderStyle: { borderLeftColor: fill, borderLeftWidth: 2, opacity: 0.7 },
        textStyle: { color: fill },
    }
}

/** Get sort string from a record (JSON string). */
export function parseSortFromRecord(record: string): string {
    try {
        return JSON.parse(record).sort || ''
    } catch {
        return ''
    }
}
