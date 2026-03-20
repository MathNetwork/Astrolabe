import leancode.FreeCategory
import Mathlib.CategoryTheory.Functor.FullyFaithful

/-!
# Import Functor (Theorem 7.1)

A signature morphism (preserving source and target) naturally extends
to a functor between the free categories.
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- **Theorem 7.1**: A signature morphism extends to a functor
    between free categories.

    Examples (implemented in Python, not formalized here):
    - F_ilean : Lean compilation output → A(Σ)
    - F_BibTeX : BibTeX data → A(Σ) -/
def importFunctor {S T : Signature.{u}}
    (φ : SignatureMorphism S T) :
    AstrolabeCat S ⥤ AstrolabeCat T :=
  Paths.lift φ.toPrefunctor

/-- The import functor acts as φ.onObj on objects. -/
theorem importFunctor_obj {S T : Signature.{u}}
    (φ : SignatureMorphism S T) (a : S.O) :
    (importFunctor φ).obj a = φ.onObj a :=
  rfl

/-- An injective signature morphism is faithful on generators. -/
theorem injective_import_faithful_on_generators
    {S T : Signature.{u}} (φ : SignatureMorphism S T)
    (hinj : φ.Injective)
    {a b : S.O}
    (e₁ e₂ : @Quiver.Hom S.O (signatureQuiver S) a b)
    (h : φ.toPrefunctor.map e₁ = φ.toPrefunctor.map e₂) :
    e₁ = e₂ := by
  -- toPrefunctor.map e = (mapEdge φ e).toPath
  -- so equal toPath ⟹ equal edge ⟹ equal onMor ⟹ equal
  have hp := toPath_injective _ _ h
  have hm : φ.onMor e₁.val = φ.onMor e₂.val :=
    congrArg Subtype.val hp
  have := hinj.onMor_inj hm
  obtain ⟨m₁, hs₁, ht₁⟩ := e₁
  obtain ⟨m₂, hs₂, ht₂⟩ := e₂
  simp at this; subst this; rfl

end AstrolabeCategory
