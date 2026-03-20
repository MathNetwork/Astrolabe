import Mathlib.CategoryTheory.Category.Basic
import Mathlib.CategoryTheory.PathCategory.Basic

universe u

namespace AstrolabeCategory

/-- Open information record: partial function from String to String. -/
def Info := String → Option String

/-- Astrolabe signature: the generating data for an Astrolabe category.
    A triple (O, M, h) where:
    - O: objects with info records
    - M: morphisms with source, target, and info records
    - h: injective global identifier -/
structure Signature where
  O : Type u
  M : Type u
  s : M → O
  t : M → O
  h : O ⊕ M → String
  h_injective : Function.Injective h
  info_O : O → Info
  info_M : M → Info

open CategoryTheory

/-- A signature induces a quiver: objects are O, arrows are M. -/
instance signatureQuiver (sig : Signature.{u}) : Quiver sig.O where
  Hom a b := { m : sig.M // sig.s m = a ∧ sig.t m = b }

-- ============================================================
-- Signature Morphisms
-- ============================================================

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

end AstrolabeCategory
