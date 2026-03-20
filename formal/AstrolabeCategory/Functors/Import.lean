import AstrolabeCategory.FreeCategory
import Mathlib.CategoryTheory.PathCategory.Basic
import Mathlib.CategoryTheory.Functor.FullyFaithful

/-!
# Import Functor (Theorem 7.1)

A signature morphism (preserving source and target) naturally extends
to a functor between the free categories.
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

/-- A signature morphism maps objects and morphisms
    while preserving source and target. -/
structure SignatureMorphism (S T : Signature.{u}) where
  onObj : S.O → T.O
  onMor : S.M → T.M
  preserve_source : ∀ m, T.s (onMor m) = onObj (S.s m)
  preserve_target : ∀ m, T.t (onMor m) = onObj (S.t m)

/-- Helper: map a generating edge through a signature morphism. -/
def mapEdge {S T : Signature.{u}}
    (φ : SignatureMorphism S T)
    {a b : S.O} (e : @Quiver.Hom S.O (signatureQuiver S) a b) :
    @Quiver.Hom T.O (signatureQuiver T) (φ.onObj a) (φ.onObj b) :=
  ⟨φ.onMor e.val,
    by rw [φ.preserve_source, e.prop.1],
    by rw [φ.preserve_target, e.prop.2]⟩

/-- A signature morphism induces a prefunctor on quivers. -/
def SignatureMorphism.toPrefunctor
    {S T : Signature.{u}} (φ : SignatureMorphism S T) :
    S.O ⥤q Paths T.O where
  obj a := φ.onObj a
  map e := (mapEdge φ e).toPath

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

-- ============================================================
-- Composition and identity of signature morphisms
-- ============================================================

/-- Signature morphisms compose. -/
def SignatureMorphism.comp {S T U : Signature.{u}}
    (φ : SignatureMorphism S T) (ψ : SignatureMorphism T U) :
    SignatureMorphism S U where
  onObj := ψ.onObj ∘ φ.onObj
  onMor := ψ.onMor ∘ φ.onMor
  preserve_source m := by
    simp [ψ.preserve_source, φ.preserve_source]
  preserve_target m := by
    simp [ψ.preserve_target, φ.preserve_target]

/-- Identity signature morphism. -/
def SignatureMorphism.id (S : Signature.{u}) :
    SignatureMorphism S S where
  onObj := _root_.id
  onMor := _root_.id
  preserve_source _ := rfl
  preserve_target _ := rfl

-- ============================================================
-- Faithfulness
-- ============================================================

/-- A signature morphism is injective if both maps are. -/
structure SignatureMorphism.Injective {S T : Signature.{u}}
    (φ : SignatureMorphism S T) : Prop where
  onObj_inj : Function.Injective φ.onObj
  onMor_inj : Function.Injective φ.onMor

/-- toPath is injective. -/
theorem toPath_injective {V : Type*} [Quiver V] {a b : V}
    (e₁ e₂ : a ⟶ b)
    (h : Quiver.Hom.toPath e₁ = Quiver.Hom.toPath e₂) :
    e₁ = e₂ := by
  suffices e₁ = e₂ from this
  simpa [Quiver.Hom.toPath] using h

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
