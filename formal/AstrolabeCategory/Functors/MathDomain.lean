import AstrolabeCategory.Functors.NetworkAnalysis

/-!
# Math Domain Functor

An enrichment functor that provides default key semantics for
mathematical knowledge: name, sort, status, statement, proof, etc.

Since enrichment is identity on the categorical structure (objects
and morphisms unchanged), this is modeled as `infoEnrichment`.

## Main results

- mathDomainFunctor is a well-defined functor
- mathDomainFunctor is faithful
- mathDomainFunctor is idempotent (applying defaults twice = once)
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- The math domain functor enriches info records with default
    mathematical fields. Categorically, it is the identity functor
    (enrichment happens at the info record level, not the category level). -/
def mathDomainFunctor (sig : Signature.{u}) :
    AstrolabeCat sig ⥤ AstrolabeCat sig :=
  infoEnrichment sig

/-- Math domain enrichment is faithful. -/
theorem mathDomain_faithful (sig : Signature.{u})
    {a b : AstrolabeCat sig} (f g : a ⟶ b)
    (h : (mathDomainFunctor sig).map f =
         (mathDomainFunctor sig).map g) :
    f = g :=
  infoEnrichment_faithful sig f g h

/-- Math domain enrichment is idempotent. -/
theorem mathDomain_idempotent (sig : Signature.{u}) :
    mathDomainFunctor sig ⋙ mathDomainFunctor sig =
    mathDomainFunctor sig :=
  infoEnrichment_comp sig

end AstrolabeCategory
