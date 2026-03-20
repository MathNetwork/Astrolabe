import AstrolabeCategory.FreeCategory
import Mathlib.CategoryTheory.Quotient

/-!
# Quotient of the Astrolabe Category

Given a congruence relation on A(Σ), we can form the quotient category.
This is used when morphisms in the free category should be identified
(e.g., two paths that represent the same logical dependency).

The construction reuses Mathlib's `CategoryTheory.Quotient`.
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- A relation on morphisms of A(sig) that identifies paths.
    This is the data needed to quotient the free category. -/
structure QuotientData (sig : Signature.{u}) where
  /-- The hom-relation on the free category. -/
  rel : HomRel (AstrolabeCat sig)
  /-- The relation must be a congruence (compatible with composition). -/
  cong : Congruence rel

/-- The quotient astrolabe category: A(sig) / ∼ where ∼ is a congruence. -/
def AstrolabeCatQuotient (sig : Signature.{u}) (qd : QuotientData sig) :=
  CategoryTheory.Quotient qd.rel

/-- The quotient is a category (inherited from Mathlib's Quotient). -/
instance (sig : Signature.{u}) (qd : QuotientData sig) :
    Category (AstrolabeCatQuotient sig qd) :=
  CategoryTheory.Quotient.category qd.rel

/-- The projection functor from A(sig) to its quotient. -/
def quotientFunctor (sig : Signature.{u}) (qd : QuotientData sig) :
    AstrolabeCat sig ⥤ AstrolabeCatQuotient sig qd :=
  CategoryTheory.Quotient.functor qd.rel

-- Example: any functor F : A(sig) ⥤ D induces a congruence (identifying
-- morphisms with the same image under F), giving a valid QuotientData.
-- See Mathlib's `Functor.congruence_homRel` for the proof.

end AstrolabeCategory
