import AstrolabeCategory.Functors.NetworkAnalysis
import AstrolabeCategory.Functors.MathDomain

/-!
# Timestamp Functor

An enrichment functor for temporal metadata (created_at, updated_at).
Categorically identical to `infoEnrichment` — enrichment happens at
the info record level.

## Main results

- timestampFunctor is well-defined
- timestampFunctor commutes with mathDomainFunctor
  (both are identity functors, so they trivially commute)
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- The timestamp functor enriches info records with temporal
    metadata. Categorically, it is the identity functor. -/
def timestampFunctor (sig : Signature.{u}) :
    AstrolabeCat sig ⥤ AstrolabeCat sig :=
  infoEnrichment sig

/-- Timestamp enrichment is faithful. -/
theorem timestamp_faithful (sig : Signature.{u})
    {a b : AstrolabeCat sig} (f g : a ⟶ b)
    (h : (timestampFunctor sig).map f =
         (timestampFunctor sig).map g) :
    f = g :=
  infoEnrichment_faithful sig f g h

/-- Timestamp commutes with math domain: both are identity,
    so their composition in either order equals the identity. -/
theorem timestamp_mathDomain_commute (sig : Signature.{u}) :
    timestampFunctor sig ⋙ mathDomainFunctor sig =
    mathDomainFunctor sig ⋙ timestampFunctor sig := by
  -- Both are 𝟭, so 𝟭 ⋙ 𝟭 = 𝟭 = 𝟭 ⋙ 𝟭
  simp [timestampFunctor, mathDomainFunctor, infoEnrichment]

/-- The combined enrichment pipeline (math domain then timestamp)
    is still just the identity functor. -/
theorem enrichment_pipeline (sig : Signature.{u}) :
    mathDomainFunctor sig ⋙ timestampFunctor sig =
    infoEnrichment sig :=
  infoEnrichment_comp sig

end AstrolabeCategory
