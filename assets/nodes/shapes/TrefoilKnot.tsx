import { TorusKnot as DreiTorusKnot } from '@react-three/drei'
import type { NodeShape3DProps, NodeShape2DConfig } from '../../types'

/** Trefoil knot (p=2, q=3) — simpler tangle, used for Gap nodes */
export function TrefoilKnot3D({ size, color, isSelected }: NodeShape3DProps) {
  return (
    <DreiTorusKnot args={[size * 0.5, size * 0.18, 48, 8, 2, 3]}>
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.8 : 0}
      />
    </DreiTorusKnot>
  )
}

export function TrefoilKnot2D({ size, color }: NodeShape3DProps): NodeShape2DConfig {
  return {
    type: 'star',
    size: size * 10,
    color: color,
  }
}
