import leancode.FreeCategory

/-!
# Layout Functor L : A(Σ) → P

## Position category P

Objects: coordinate assignments (functions from obj indices to ℝ²).
Morphisms: deformations (any two assignments are connected).

Since any position can transition to any other (continuous deformation),
P is modeled as a codiscrete (indiscrete) category: exactly one morphism
between any two objects.

## Main results

- Position assignments form a codiscrete category
- Any function from sig.O to positions extends to a functor
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- A 2D position. -/
structure Pos2D where
  x : Int
  y : Int

/-- Position assignment: each object index gets a position. -/
def PosAssignment (sig : Signature.{u}) := sig.O → Pos2D

/-- Position assignments form a codiscrete category:
    exactly one morphism between any two assignments
    (representing a continuous deformation). -/
instance (sig : Signature.{u}) :
    Category (PosAssignment sig) where
  Hom _ _ := Unit
  id _ := ()
  comp _ _ := ()

/-- A layout function maps objects to initial positions. -/
structure LayoutData (sig : Signature.{u}) where
  /-- Initial position for each object. -/
  initialPos : sig.O → Pos2D

/-- The layout functor maps A(sig) to position assignments.
    All objects map to the initial assignment;
    all morphisms map to the unique morphism (deformation). -/
def layoutFunctor {sig : Signature.{u}}
    (ld : LayoutData sig) :
    AstrolabeCat sig ⥤ PosAssignment sig where
  obj _ := ld.initialPos
  map _ := ()
  map_id _ := rfl
  map_comp _ _ := rfl

/-- The layout functor preserves identity. -/
theorem layoutFunctor_map_id {sig : Signature.{u}}
    (ld : LayoutData sig) (a : AstrolabeCat sig) :
    (layoutFunctor ld).map (𝟙 a) = 𝟙 _ :=
  rfl

/-- The layout functor preserves composition. -/
theorem layoutFunctor_map_comp {sig : Signature.{u}}
    (ld : LayoutData sig)
    {a b c : AstrolabeCat sig} (f : a ⟶ b) (g : b ⟶ c) :
    (layoutFunctor ld).map (f ≫ g) =
    (layoutFunctor ld).map f ≫ (layoutFunctor ld).map g :=
  rfl

end AstrolabeCategory
