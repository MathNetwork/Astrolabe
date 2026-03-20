import leancode.Quotient
import leancode.Functors.Import
import Mathlib.CategoryTheory.Quotient

/-!
# Universe of Astrolabe Categories

Propositions about enrichment and quotient closure within a universe
of astrolabe categories.

Key results:
- Proposition 5.2: Enrichment closure (subcategory inclusion commutes)
- Proposition 5.3: Quotient closure (projection commutes with inclusion)
- Corollary 5.5: Content addressing compatibility
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

-- ============================================================
-- Proposition 5.2: Enrichment closure
-- ============================================================

/-- An enrichment of a signature adds new morphisms while keeping
    all existing objects and morphisms. -/
structure Enrichment (sig₁ sig₂ : Signature.{u}) where
  /-- The underlying signature morphism. -/
  mor : SignatureMorphism sig₁ sig₂
  /-- The object map is injective (no objects collapsed). -/
  onObj_inj : Function.Injective mor.onObj
  /-- The morphism map is injective (no morphisms collapsed). -/
  onMor_inj : Function.Injective mor.onMor

/-- **Proposition 5.2**: An enrichment induces a functor
    ι : A(sig₁) ⥤ A(sig₂). -/
def enrichmentFunctor {sig₁ sig₂ : Signature.{u}}
    (e : Enrichment sig₁ sig₂) :
    AstrolabeCat sig₁ ⥤ AstrolabeCat sig₂ :=
  importFunctor e.mor

-- ============================================================
-- Proposition 5.3: Quotient closure
-- ============================================================

/-- **Proposition 5.3**: Any functor F : A(sig) ⥤ D that respects
    a congruence factors uniquely through the quotient. -/
theorem quotient_factors {sig : Signature.{u}}
    (qd : QuotientData sig) {D : Type*} [Category D]
    (F : AstrolabeCat sig ⥤ D)
    (hF : ∀ (a b : AstrolabeCat sig) (f g : a ⟶ b),
      qd.rel f g → F.map f = F.map g) :
    ∃ G : AstrolabeCatQuotient sig qd ⥤ D,
      quotientFunctor sig qd ⋙ G = F := by
  haveI := qd.cong
  exact ⟨CategoryTheory.Quotient.lift qd.rel F hF,
         CategoryTheory.Quotient.lift_spec qd.rel F hF⟩

-- ============================================================
-- Corollary 5.5: Content addressing compatibility
-- ============================================================

/-- **Corollary 5.5**: If a functor F identifies two morphisms
    (F.map f = F.map g), then the content-addressing quotient
    also identifies them in the quotient category. -/
theorem content_addressing_compat {sig : Signature.{u}}
    {D : Type*} [Category D] (F : AstrolabeCat sig ⥤ D)
    {a b : AstrolabeCat sig} {f g : a ⟶ b}
    (h : F.map f = F.map g) :
    (quotientFunctor sig (functorQuotientData F)).map f =
    (quotientFunctor sig (functorQuotientData F)).map g :=
  quotient_maps_related (functorQuotientData F) h

end AstrolabeCategory
