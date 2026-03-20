import AstrolabeCategory.Functors.Import
import AstrolabeCategory.Universe
import AstrolabeCategory.SignatureCategory

/-!
# Lean Import Functor F_ilean

Concrete instance of Theorem 7.1: given any target signature and
source/target-preserving maps, the import functor is well-defined.

The Lean-specific signature details (ConstantInfo, etc.) are in Python.
Here we prove the abstract property that any such map yields a functor.
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- An injective import is faithful on generators. -/
theorem concreteImport_faithful {S T : Signature.{u}}
    (φ : SignatureMorphism S T)
    (hinj : φ.Injective)
    {a b : S.O}
    (e₁ e₂ : @Quiver.Hom _ (signatureQuiver S) a b)
    (h : φ.toPrefunctor.map e₁ = φ.toPrefunctor.map e₂) :
    e₁ = e₂ :=
  injective_import_faithful_on_generators φ hinj e₁ e₂ h

/-- Two different import functors into the same target can coexist:
    their images are independent subcategories. -/
theorem import_images_independent
    {S₁ S₂ T : Signature.{u}}
    (φ₁ : SignatureMorphism S₁ T)
    (φ₂ : SignatureMorphism S₂ T)
    (h_disjoint : ∀ a₁ a₂,
      φ₁.onObj a₁ = φ₂.onObj a₂ → False) :
    ∀ (a : S₁.O) (b : S₂.O),
      (importFunctor φ₁).obj a ≠ (importFunctor φ₂).obj b :=
  fun a b h => h_disjoint a b h

/-- Import functors compose with enrichment functors. -/
theorem import_then_enrich
    {S T U : Signature.{u}}
    (φ : SignatureMorphism S T)
    (e : Enrichment T U) :
    importFunctor φ ⋙ enrichmentFunctor e =
    importFunctor (SignatureMorphism.comp φ e.mor) :=
  (free_map_comp φ e.mor).symm

end AstrolabeCategory
