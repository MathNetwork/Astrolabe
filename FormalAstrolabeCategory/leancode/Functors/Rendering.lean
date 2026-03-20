import leancode.FreeCategory
import leancode.Functors.NaturalTransformation

/-!
# Rendering Functor R : A(Σ) → V

Visual attributes form a category. A rendering function maps each
object to visual attributes and extends to a functor.

Since different objects may have different visuals, V cannot be discrete.
We model V as codiscrete (any visual can transition to any other).

## Main results

- Visual category V (codiscrete)
- renderingFunctor: any object→visual map extends to a functor
- Natural transformation between renderings (override)
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- Visual attribute type. -/
structure Visual where
  color : Nat
  width : Nat
  opacity : Nat

/-- Visual attributes form a codiscrete category:
    exactly one morphism between any two visual states
    (representing any visual transition). -/
instance : Category Visual where
  Hom _ _ := Unit
  id _ := ()
  comp _ _ := ()

/-- A rendering function. -/
structure RenderingData (sig : Signature.{u}) where
  onObj : sig.O → Visual

/-- The rendering functor. All morphisms map to the unique transition. -/
def renderingFunctor {sig : Signature.{u}}
    (rd : RenderingData sig) :
    AstrolabeCat sig ⥤ Visual where
  obj a := rd.onObj a
  map _ := ()
  map_id _ := rfl
  map_comp _ _ := rfl

/-- An override between two renderings is a natural transformation.
    In a codiscrete target, any family of morphisms is natural. -/
def renderingOverride {sig : Signature.{u}}
    (rd₁ rd₂ : RenderingData sig) :
    renderingFunctor rd₁ ⟶ renderingFunctor rd₂ where
  app _ := ()
  naturality _ _ _ := rfl

/-- Overrides compose. -/
def renderingOverrideComp {sig : Signature.{u}}
    (rd₁ rd₂ rd₃ : RenderingData sig) :
    renderingFunctor rd₁ ⟶ renderingFunctor rd₃ :=
  renderingOverride rd₁ rd₂ ≫ renderingOverride rd₂ rd₃

/-- Override composition is the direct override (both are unit). -/
theorem renderingOverride_comp_eq {sig : Signature.{u}}
    (rd₁ rd₂ rd₃ : RenderingData sig) :
    renderingOverrideComp rd₁ rd₂ rd₃ =
    renderingOverride rd₁ rd₃ := rfl

end AstrolabeCategory
