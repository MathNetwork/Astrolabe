import leancode.FreeCategory
import leancode.Universe

/-!
# Network Analysis Functor A_network

An enrichment functor: A_M(Σ) → A_M'(Σ).
Adds metadata keys (betweenness, pagerank, community) without changing
the object or morphism sets — identity on structure, extension on info.

## Main results

- `infoEnrichment`: a functor that is identity on objects/morphisms
- `infoEnrichment_faithful`: enrichment is faithful (injective on hom-sets)
- `infoEnrichment_comp`: composition of enrichments is an enrichment
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- An info enrichment extends info records without changing structure.
    Modeled as the identity functor — the enrichment happens at the
    info record level (outside the categorical structure). -/
def infoEnrichment (sig : Signature.{u}) :
    AstrolabeCat sig ⥤ AstrolabeCat sig :=
  𝟭 (AstrolabeCat sig)

/-- Enrichment is faithful: identity on morphisms is injective. -/
theorem infoEnrichment_faithful (sig : Signature.{u})
    {a b : AstrolabeCat sig} (f g : a ⟶ b)
    (h : (infoEnrichment sig).map f = (infoEnrichment sig).map g) :
    f = g :=
  h  -- identity functor maps f ↦ f

/-- Composition of enrichments is an enrichment. -/
theorem infoEnrichment_comp (sig : Signature.{u}) :
    infoEnrichment sig ⋙ infoEnrichment sig =
    infoEnrichment sig :=
  Functor.comp_id _

end AstrolabeCategory
