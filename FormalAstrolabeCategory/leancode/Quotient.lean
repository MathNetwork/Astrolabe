import leancode.FreeCategory
import Mathlib.CategoryTheory.Quotient

/-!
# Quotient of the Astrolabe Category

Given a congruence relation on A(Σ), we form the quotient category.
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- Data needed to quotient: a hom-relation that is a congruence. -/
structure QuotientData (sig : Signature.{u}) where
  rel : HomRel (AstrolabeCat sig)
  cong : Congruence rel

/-- The quotient category A(sig) / ∼. -/
def AstrolabeCatQuotient (sig : Signature.{u})
    (qd : QuotientData sig) :=
  CategoryTheory.Quotient qd.rel

instance (sig : Signature.{u}) (qd : QuotientData sig) :
    Category (AstrolabeCatQuotient sig qd) :=
  CategoryTheory.Quotient.category qd.rel

/-- The projection functor π : A(sig) ⥤ A(sig)/∼. -/
def quotientFunctor (sig : Signature.{u})
    (qd : QuotientData sig) :
    AstrolabeCat sig ⥤ AstrolabeCatQuotient sig qd :=
  CategoryTheory.Quotient.functor qd.rel

-- ============================================================
-- Proposition 4.3: Congruence compatibility
-- ============================================================

/-- **Prop 4.3 (left)**: `f ∼ g → h ≫ f ∼ h ≫ g`. -/
theorem congr_comp_left {sig : Signature.{u}}
    (qd : QuotientData sig)
    {a b c : AstrolabeCat sig} (h : a ⟶ b)
    {f g : b ⟶ c} (hfg : qd.rel f g) :
    qd.rel (h ≫ f) (h ≫ g) :=
  haveI := qd.cong; HomRel.comp_left h hfg

/-- **Prop 4.3 (right)**: `f ∼ g → f ≫ h ∼ g ≫ h`. -/
theorem congr_comp_right {sig : Signature.{u}}
    (qd : QuotientData sig)
    {a b c : AstrolabeCat sig} {f g : a ⟶ b}
    (h : b ⟶ c) (hfg : qd.rel f g) :
    qd.rel (f ≫ h) (g ≫ h) :=
  haveI := qd.cong; HomRel.comp_right h hfg

/-- **Prop 4.3 (well-def)**: π maps related morphisms to equal ones. -/
theorem quotient_maps_related {sig : Signature.{u}}
    (qd : QuotientData sig)
    {a b : AstrolabeCat sig} {f g : a ⟶ b}
    (hfg : qd.rel f g) :
    (quotientFunctor sig qd).map f =
    (quotientFunctor sig qd).map g :=
  Quot.sound (HomRel.CompClosure.of hfg)

-- ============================================================
-- Projection properties
-- ============================================================

/-- π is surjective on objects. -/
theorem projection_surj_obj {sig : Signature.{u}}
    (qd : QuotientData sig)
    (x : AstrolabeCatQuotient sig qd) :
    ∃ a : AstrolabeCat sig,
      (quotientFunctor sig qd).obj a = x :=
  ⟨x.as, rfl⟩

/-- π preserves composition (it's a functor). -/
theorem projection_preserves_comp {sig : Signature.{u}}
    (qd : QuotientData sig)
    {a b c : AstrolabeCat sig} (f : a ⟶ b) (g : b ⟶ c) :
    (quotientFunctor sig qd).map (f ≫ g) =
    (quotientFunctor sig qd).map f ≫
    (quotientFunctor sig qd).map g :=
  (quotientFunctor sig qd).map_comp f g

/-- π preserves identity. -/
theorem projection_preserves_id {sig : Signature.{u}}
    (qd : QuotientData sig) (a : AstrolabeCat sig) :
    (quotientFunctor sig qd).map (𝟙 a) =
    𝟙 ((quotientFunctor sig qd).obj a) :=
  (quotientFunctor sig qd).map_id a

-- ============================================================
-- Example 5.4: Content addressing as functor congruence
-- ============================================================

/-- Any functor F induces a valid congruence (content addressing). -/
def functorQuotientData {sig : Signature.{u}}
    {D : Type*} [Category D] (F : AstrolabeCat sig ⥤ D) :
    QuotientData sig where
  rel := F.homRel
  cong := Functor.congruence_homRel F

/-- Content hash equality is reflexive. -/
theorem content_hash_refl {sig : Signature.{u}}
    {D : Type*} [Category D] (F : AstrolabeCat sig ⥤ D)
    {a b : AstrolabeCat sig} (f : a ⟶ b) :
    F.homRel f f :=
  haveI := Functor.congruence_homRel F
  (Congruence.equivalence (r := F.homRel)).refl f

/-- Content hash equality is symmetric. -/
theorem content_hash_symm {sig : Signature.{u}}
    {D : Type*} [Category D] (F : AstrolabeCat sig ⥤ D)
    {a b : AstrolabeCat sig} {f g : a ⟶ b}
    (h : F.homRel f g) : F.homRel g f :=
  haveI := Functor.congruence_homRel F
  (Congruence.equivalence (r := F.homRel)).symm h

/-- Content hash equality is transitive. -/
theorem content_hash_trans {sig : Signature.{u}}
    {D : Type*} [Category D] (F : AstrolabeCat sig ⥤ D)
    {a b : AstrolabeCat sig} {f g k : a ⟶ b}
    (hfg : F.homRel f g) (hgk : F.homRel g k) :
    F.homRel f k :=
  haveI := Functor.congruence_homRel F
  (Congruence.equivalence (r := F.homRel)).trans hfg hgk

end AstrolabeCategory
