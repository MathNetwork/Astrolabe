import { Capsule as DreiCapsule } from '@react-three/drei'
import type { NodeShape3DProps, NodeShape2DConfig } from '../../types'

/** Long capsule — elongated pill, used for Motivation nodes */
export function LongCapsule3D({ size, color, isSelected }: NodeShape3DProps) {
  return (
    <DreiCapsule args={[size * 0.35, size * 1.6, 8, 16]}>
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.8 : 0}
      />
    </DreiCapsule>
  )
}

export function LongCapsule2D({ size, color }: NodeShape3DProps): NodeShape2DConfig {
  return {
    type: 'circle',
    size: size * 10,
    color: color,
  }
}
