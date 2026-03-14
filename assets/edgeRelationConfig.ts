/**
 * @deprecated Use morphismSortConfig.ts instead.
 * This file re-exports for backward compatibility.
 */
export {
  MORPHISM_SORT_CONFIG as EDGE_RELATION_CONFIG,
  MORPHISM_SORT_DEFAULT as EDGE_RELATION_DEFAULT,
  getMorphismSort as getEdgeRelationVisual,
} from './morphismSortConfig'
export type { MorphismSortVisual as EdgeRelationVisual } from './morphismSortConfig'
