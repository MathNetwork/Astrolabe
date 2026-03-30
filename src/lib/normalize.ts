/** Normalize metric values to a target range (for node radius). */
export function normalizeToRange(
    values: Record<string, number>,
    minOut: number,
    maxOut: number,
): Record<string, number> {
    const keys = Object.keys(values)
    if (keys.length === 0) return {}

    const vals = Object.values(values)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const mid = (minOut + maxOut) / 2

    if (max === min) {
        return Object.fromEntries(keys.map(k => [k, mid]))
    }

    return Object.fromEntries(
        keys.map(k => [k, minOut + ((values[k] - min) / (max - min)) * (maxOut - minOut)])
    )
}

/** Map metric values to a cool→warm gradient (hex colors). */
export function valuesToGradient(values: Record<string, number>): Record<string, string> {
    const keys = Object.keys(values)
    if (keys.length === 0) return {}

    const vals = Object.values(values)
    const min = Math.min(...vals)
    const max = Math.max(...vals)

    return Object.fromEntries(
        keys.map(k => {
            const t = max === min ? 0.5 : (values[k] - min) / (max - min)
            // Cool (blue, hue=220) → Warm (red, hue=0)
            const hue = Math.round(220 * (1 - t))
            const sat = 70
            const lit = 50
            return [k, hslToHex(hue, sat, lit)]
        })
    )
}

function hslToHex(h: number, s: number, l: number): string {
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
        return Math.round((l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
    }
    return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')
}
