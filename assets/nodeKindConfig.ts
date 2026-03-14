/**
 * @deprecated Use objectSortConfig.ts instead.
 * This file re-exports for backward compatibility.
 */
export {
  OBJECT_SORT_CONFIG as NODE_KIND_CONFIG,
  OBJECT_SORT_DEFAULT as NODE_KIND_DEFAULT,
  getObjectSort as getNodeKindVisual,
} from './objectSortConfig'
export type { ObjectSortVisual as NodeKindVisual } from './objectSortConfig'
