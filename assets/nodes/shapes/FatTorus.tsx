import { Torus as DreiTorus } from '@react-three/drei'
import type { NodeShape3DProps, NodeShape2DConfig } from '../../types'

/** Fat torus — thick ring like a chain link, used for Connection nodes */
export function FatTorus3D({ size, color, isSelected }: NodeShape3DProps) {
  return (
    <DreiTorus args={[size * 0.7, size * 0.45, 12, 24]}>
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.8 : 0}
      />
    </DreiTorus>
  )
}

export function FatTorus2D({ size, color }: NodeShape3DProps): NodeShape2DConfig {
  return {
    type: 'ring',
    size: size * 12,
    color: color,
  }
}
