/**
 * sortStats — 从 objects/morphisms 统计 sort 分布
 *
 * 纯函数，零副作用。
 */
import { getObjectSort, MORPHISM_DEFAULT } from './sortConfig'

export interface SortStat {
    sort: string
    count: number
    color: string
}

export interface SortStatsResult {
    objSorts: SortStat[]
    morSorts: SortStat[]
    objNoSort: number
    morNoSort: number
}

export function computeSortStats(
    objects: { sort?: string }[],
    morphisms: { sort?: string }[],
): SortStatsResult {
    const objCounts = new Map<string, number>()
    let objNoSort = 0

    for (const obj of objects) {
        if (!obj.sort) {
            objNoSort++
        } else {
            objCounts.set(obj.sort, (objCounts.get(obj.sort) || 0) + 1)
        }
    }

    const morCounts = new Map<string, number>()
    let morNoSort = 0

    for (const mor of morphisms) {
        if (!mor.sort) {
            morNoSort++
        } else {
            morCounts.set(mor.sort, (morCounts.get(mor.sort) || 0) + 1)
        }
    }

    const objSorts: SortStat[] = Array.from(objCounts.entries())
        .map(([sort, count]) => ({ sort, count, color: getObjectSort(sort).color }))
        .sort((a, b) => b.count - a.count)

    const morSorts: SortStat[] = Array.from(morCounts.entries())
        .map(([sort, count]) => ({ sort, count, color: getObjectSort(sort).color }))
        .sort((a, b) => b.count - a.count)

    return { objSorts, morSorts, objNoSort, morNoSort }
}
