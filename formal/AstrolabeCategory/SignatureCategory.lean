import AstrolabeCategory.Functors.Import
import Mathlib.CategoryTheory.Category.Basic

/-!
# The Category of Signatures

Signature morphisms compose associatively with identity, so signatures
form a category Sig.
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

@[ext]
theorem SignatureMorphism.ext' {S T : Signature.{u}}
    {φ ψ : SignatureMorphism S T}
    (hObj : φ.onObj = ψ.onObj)
    (hMor : φ.onMor = ψ.onMor) :
    φ = ψ := by
  cases φ; cases ψ; simp_all

/-- Signatures and signature morphisms form a category. -/
instance : Category (Signature.{u}) where
  Hom := SignatureMorphism
  id S := SignatureMorphism.id S
  comp f g := SignatureMorphism.comp f g
  id_comp f := by ext <;> rfl
  comp_id f := by ext <;> rfl
  assoc f g h := by ext <;> rfl

-- ============================================================
-- Free is functorial
-- ============================================================

/-- Free(id_S) = id_{A(S)}. -/
theorem free_map_id (S : Signature.{u}) :
    importFunctor (SignatureMorphism.id S) =
    𝟭 (AstrolabeCat S) := by
  have hobj : (importFunctor (SignatureMorphism.id S)).obj =
    (𝟭 (AstrolabeCat S)).obj := rfl
  apply Paths.ext_functor hobj
  intro a b e
  simp [eqToHom_refl, Category.id_comp, Category.comp_id,
    importFunctor, Paths.lift_toPath,
    SignatureMorphism.toPrefunctor,
    SignatureMorphism.id, mapEdge]

/-- Free(ψ ∘ φ) = Free(φ) ⋙ Free(ψ). -/
theorem free_map_comp {S T U : Signature.{u}}
    (φ : SignatureMorphism S T)
    (ψ : SignatureMorphism T U) :
    importFunctor (SignatureMorphism.comp φ ψ) =
    importFunctor φ ⋙ importFunctor ψ := by
  have hobj : (importFunctor (φ.comp ψ)).obj =
    (importFunctor φ ⋙ importFunctor ψ).obj := rfl
  apply Paths.ext_functor hobj
  intro a b e
  simp [eqToHom_refl, Category.id_comp, Category.comp_id,
    importFunctor, Paths.lift_toPath,
    SignatureMorphism.toPrefunctor,
    SignatureMorphism.comp, mapEdge]

end AstrolabeCategory
