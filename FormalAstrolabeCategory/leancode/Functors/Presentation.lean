import leancode.FreeCategory

/-!
# Presentation Functor P : A(Σ) → U_ui

UI components form a codiscrete category (any component can
transition to any other via state updates).

## Main results

- presentationFunctor is a well-defined functor
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- A UI component type (abstract). -/
structure UIComponent where
  tag : String
  contentHash : Nat

/-- UI components form a codiscrete category:
    any component can transition to any other. -/
instance : Category UIComponent where
  Hom _ _ := Unit
  id _ := ()
  comp _ _ := ()

/-- Presentation data: how to render each object. -/
structure PresentationData (sig : Signature.{u}) where
  render : sig.O → UIComponent

/-- The presentation functor. -/
def presentationFunctor {sig : Signature.{u}}
    (pd : PresentationData sig) :
    AstrolabeCat sig ⥤ UIComponent where
  obj a := pd.render a
  map _ := ()
  map_id _ := rfl
  map_comp _ _ := rfl

end AstrolabeCategory
