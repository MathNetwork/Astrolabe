import { TorusKnot as DreiTorusKnot } from '@react-three/drei'
import type { NodeShape3DProps, NodeShape2DConfig } from '../../types'

/** Cinquefoil knot (p=2, q=5) — complex tangle, used for Conjecture nodes */
export function CinquefoilKnot3D({ size, color, isSelected }: NodeShape3DProps) {
  return (
    <DreiTorusKnot args={[size * 0.5, size * 0.15, 64, 8, 2, 5]}>
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.8 : 0}
      />
    </DreiTorusKnot>
  )
}

export function CinquefoilKnot2D({ size, color }: NodeShape3DProps): NodeShape2DConfig {
  return {
    type: 'star',
    size: size * 10,
    color: color,
  }
}
