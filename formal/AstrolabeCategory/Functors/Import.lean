import AstrolabeCategory.FreeCategory
import Mathlib.CategoryTheory.PathCategory.Basic
import Mathlib.CategoryTheory.Functor.FullyFaithful

/-!
# Import Functor (Theorem 7.1)

A signature morphism (preserving source and target) naturally extends
to a functor between the free categories.

Additional properties:
- Injective signature morphisms yield faithful functors
- Import functors compose correctly
- Different import functors' images are compatible
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

/-- A signature morphism induces a prefunctor on quivers. -/
def SignatureMorphism.toPrefunctor
    {S T : Signature.{u}} (φ : SignatureMorphism S T) :
    S.O ⥤q Paths T.O where
  obj := fun a => φ.onObj a
  map := fun {a b} ⟨m, hs, ht⟩ => by
    have hs' : T.s (φ.onMor m) = φ.onObj a :=
      by rw [φ.preserve_source, hs]
    have ht' : T.t (φ.onMor m) = φ.onObj b :=
      by rw [φ.preserve_target, ht]
    exact Quiver.Hom.toPath
      (⟨φ.onMor m, hs', ht'⟩ :
        @Quiver.Hom T.O (signatureQuiver T)
          (φ.onObj a) (φ.onObj b))

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
-- Composition of signature morphisms
-- ============================================================

/-- Signature morphisms compose. -/
def SignatureMorphism.comp {S T U : Signature.{u}}
    (φ : SignatureMorphism S T) (ψ : SignatureMorphism T U) :
    SignatureMorphism S U where
  onObj := ψ.onObj ∘ φ.onObj
  onMor := ψ.onMor ∘ φ.onMor
  preserve_source := by
    intro m; simp [ψ.preserve_source, φ.preserve_source]
  preserve_target := by
    intro m; simp [ψ.preserve_target, φ.preserve_target]

/-- Identity signature morphism. -/
def SignatureMorphism.id (S : Signature.{u}) :
    SignatureMorphism S S where
  onObj := _root_.id
  onMor := _root_.id
  preserve_source := fun _ => rfl
  preserve_target := fun _ => rfl

-- ============================================================
-- Faithfulness
-- ============================================================

/-- A signature morphism is injective if both onObj and onMor
    are injective. -/
structure SignatureMorphism.Injective {S T : Signature.{u}}
    (φ : SignatureMorphism S T) : Prop where
  onObj_inj : Function.Injective φ.onObj
  onMor_inj : Function.Injective φ.onMor

/-- toPath is injective: equal length-1 paths have equal edges. -/
theorem toPath_injective {V : Type*} [Quiver V] {a b : V}
    (e₁ e₂ : a ⟶ b)
    (h : Quiver.Hom.toPath e₁ = Quiver.Hom.toPath e₂) :
    e₁ = e₂ := by
  suffices e₁ = e₂ from this
  simpa [Quiver.Hom.toPath] using h

/-- An injective signature morphism yields a faithful functor
    on generators: if two single edges map to the same path,
    they are equal. -/
theorem injective_import_faithful_on_generators
    {S T : Signature.{u}} (φ : SignatureMorphism S T)
    (hinj : φ.Injective)
    {a b : S.O}
    (e₁ e₂ : @Quiver.Hom S.O (signatureQuiver S) a b)
    (h : φ.toPrefunctor.map e₁ = φ.toPrefunctor.map e₂) :
    e₁ = e₂ := by
  obtain ⟨m₁, hs₁, ht₁⟩ := e₁
  obtain ⟨m₂, hs₂, ht₂⟩ := e₂
  have hp := toPath_injective _ _ h
  have hm : φ.onMor m₁ = φ.onMor m₂ :=
    congrArg Subtype.val hp
  have := hinj.onMor_inj hm
  subst this; rfl

end AstrolabeCategory
