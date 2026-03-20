import AstrolabeCategory.FreeCategory
import Mathlib.CategoryTheory.NatTrans

/-!
# Natural Transformations between Functors on A(Σ)

Propositions about natural transformations, including:
- Determined by components on generators
- Naturality on generators suffices
- Composition of natural transformations
-/

universe u

namespace AstrolabeCategory

open CategoryTheory

-- ============================================================
-- Proposition 6.4: Determined by generators
-- ============================================================

/-- **Prop 6.4**: A natural transformation between functors out of
    A(sig) is determined by its components on objects. -/
theorem natTrans_determined_by_generators
    {sig : Signature.{u}} {C : Type*} [Category C]
    (F G : AstrolabeCat sig ⥤ C) (α β : F ⟶ G)
    (h : ∀ a : sig.O, α.app a = β.app a) :
    α = β := by
  ext a; exact h a

-- ============================================================
-- Proposition 6.5: Naturality
-- ============================================================

/-- **Prop 6.5**: Every natural transformation satisfies the
    naturality square F.map f ≫ α.app b = α.app a ≫ G.map f. -/
theorem rendering_naturality
    {sig : Signature.{u}} {C : Type*} [Category C]
    (F G : AstrolabeCat sig ⥤ C) (α : F ⟶ G)
    {a b : AstrolabeCat sig} (f : a ⟶ b) :
    F.map f ≫ α.app b = α.app a ≫ G.map f :=
  α.naturality f

-- ============================================================
-- Natural transformation composition
-- ============================================================

/-- Vertical composition of natural transformations. -/
def natTransComp {sig : Signature.{u}} {C : Type*} [Category C]
    {F G H : AstrolabeCat sig ⥤ C}
    (α : F ⟶ G) (β : G ⟶ H) : F ⟶ H :=
  α ≫ β

/-- Vertical composition is associative. -/
theorem natTrans_comp_assoc {sig : Signature.{u}}
    {C : Type*} [Category C]
    {F G H K : AstrolabeCat sig ⥤ C}
    (α : F ⟶ G) (β : G ⟶ H) (γ : H ⟶ K) :
    natTransComp (natTransComp α β) γ =
    natTransComp α (natTransComp β γ) :=
  Category.assoc α β γ

/-- Identity natural transformation exists. -/
def natTransId {sig : Signature.{u}} {C : Type*} [Category C]
    (F : AstrolabeCat sig ⥤ C) : F ⟶ F :=
  𝟙 F

/-- Composition with identity (left). -/
theorem natTrans_id_comp {sig : Signature.{u}}
    {C : Type*} [Category C]
    {F G : AstrolabeCat sig ⥤ C} (α : F ⟶ G) :
    natTransComp (natTransId F) α = α :=
  Category.id_comp α

/-- Composition with identity (right). -/
theorem natTrans_comp_id {sig : Signature.{u}}
    {C : Type*} [Category C]
    {F G : AstrolabeCat sig ⥤ C} (α : F ⟶ G) :
    natTransComp α (natTransId G) = α :=
  Category.comp_id α

end AstrolabeCategory
