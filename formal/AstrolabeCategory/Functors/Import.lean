import AstrolabeCategory.FreeCategory
import Mathlib.CategoryTheory.PathCategory.Basic

/-!
# Import Functor (Theorem 7.1)

A signature morphism (preserving source and target) naturally extends
to a functor between the free categories. This formalizes the universal
property of the free category: any graph homomorphism lifts uniquely.

This corresponds to the import functors in the software
(e.g., F_ilean : Lean → A(Σ)).
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- A signature morphism maps objects and morphisms while preserving source and target. -/
structure SignatureMorphism (S T : Signature.{u}) where
  /-- Map on objects. -/
  onObj : S.O → T.O
  /-- Map on morphisms. -/
  onMor : S.M → T.M
  /-- Source is preserved. -/
  preserve_source : ∀ m, T.s (onMor m) = onObj (S.s m)
  /-- Target is preserved. -/
  preserve_target : ∀ m, T.t (onMor m) = onObj (S.t m)

/-- A signature morphism induces a prefunctor between the underlying quivers.
    Each generating morphism m : a → b in S maps to a length-1 path in Paths T.O. -/
def SignatureMorphism.toPrefunctor {S T : Signature.{u}} (φ : SignatureMorphism S T) :
    S.O ⥤q Paths T.O where
  obj := fun a => φ.onObj a
  map := fun {a b} ⟨m, hs, ht⟩ => by
    -- m : S.M with S.s m = a and S.t m = b
    -- We need a path from φ.onObj a to φ.onObj b in Paths T.O
    have hs' : T.s (φ.onMor m) = φ.onObj a := by rw [φ.preserve_source, hs]
    have ht' : T.t (φ.onMor m) = φ.onObj b := by rw [φ.preserve_target, ht]
    let e : @Quiver.Hom T.O (signatureQuiver T) (φ.onObj a) (φ.onObj b) :=
      ⟨φ.onMor m, hs', ht'⟩
    exact Quiver.Hom.toPath e

/-- **Theorem 7.1**: Any signature morphism preserving source and target
    extends to a functor between free categories.

    Examples (implemented in Python, not formalized here):
    - F_ilean : Lean compilation output → A(Σ)
    - F_BibTeX : BibTeX data → A(Σ) -/
def importFunctor {S T : Signature.{u}} (φ : SignatureMorphism S T) :
    AstrolabeCat S ⥤ AstrolabeCat T :=
  Paths.lift φ.toPrefunctor

/-- The import functor acts as φ.onObj on objects. -/
theorem importFunctor_obj {S T : Signature.{u}} (φ : SignatureMorphism S T) (a : S.O) :
    (importFunctor φ).obj a = φ.onObj a :=
  rfl

end AstrolabeCategory
