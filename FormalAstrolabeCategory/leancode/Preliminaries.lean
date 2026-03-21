import Mathlib.CategoryTheory.Category.Basic
import Mathlib.CategoryTheory.Functor.Basic
import Mathlib.CategoryTheory.Functor.FullyFaithful
import Mathlib.CategoryTheory.NatTrans
import Mathlib.CategoryTheory.NatIso
import Mathlib.CategoryTheory.PathCategory.Basic
import Mathlib.CategoryTheory.Limits.Shapes.Terminal

/-!
# §1 Preliminaries — Mathlib References

Standard category theory. All definitions and theorems in this section
are from Mathlib. We re-export them here so that later files can import
`leancode.Preliminaries` for the standard vocabulary.

Each entry corresponds to a Definition/Proposition in the paper §1.
-/

namespace AstrolabeCategory.Preliminaries

open CategoryTheory

-- ============================================================
-- §1.1 Categories
-- ============================================================

-- Definition 1.1 (Category)
#check Category
-- Mathlib: `class Category (C : Type u) where Hom, id, comp, ...`

-- Lemma 1.2 (Uniqueness of identity)
-- Automatic in Lean: identity is part of the Category typeclass,
-- uniqueness follows from the type system.

-- Example 1.3 (Set, Grp)
-- Mathlib: `instance : Category (Type u)` etc.

-- Definition 1.4 (Initial object)
#check Limits.IsInitial

-- Proposition 1.5 (Uniqueness of initial objects)
#check Limits.IsInitial.uniqueUpToIso

-- ============================================================
-- §1.2 Functors
-- ============================================================

-- Definition 1.6 (Functor)
#check Functor

-- Definition 1.7 (Faithful functor)
#check Functor.Faithful

-- Definition 1.8 (Full functor, Fully faithful)
#check Functor.Full
#check Functor.FullyFaithful

-- Proposition 1.9 (Composition of functors)
example {C D E : Type*} [Category C] [Category D] [Category E]
    (F : C ⥤ D) (G : D ⥤ E) : C ⥤ E := F ⋙ G

-- Lemma 1.10 (Composition of faithful functors is faithful)
example {C D E : Type*} [Category C] [Category D] [Category E]
    (F : C ⥤ D) (G : D ⥤ E)
    [F.Faithful] [G.Faithful] : (F ⋙ G).Faithful :=
  Functor.Faithful.comp F G

-- Proposition 1.11 (Identity functor)
example (C : Type*) [Category C] : C ⥤ C := 𝟭 C

-- Proposition 1.12 (Functor composition is associative)
#check Functor.assoc

-- ============================================================
-- §1.3 Natural Transformations
-- ============================================================

-- Definition 1.13 (Natural transformation)
#check NatTrans

-- Definition 1.14 (Natural isomorphism)
-- A NatTrans where every component is an iso.
#check Iso  -- Used via `F ≅ G` notation

-- Proposition 1.15 (Vertical composition)
example {C D : Type*} [Category C] [Category D]
    {F G H : C ⥤ D} (η : F ⟶ G) (μ : G ⟶ H) : F ⟶ H :=
  η ≫ μ

-- Proposition 1.16 (Identity natural transformation)
example {C D : Type*} [Category C] [Category D]
    (F : C ⥤ D) : F ⟶ F := 𝟙 F

-- Theorem 1.17 (Functor category)
-- Mathlib: `instance : Category (C ⥤ D)` (automatic)
example (C D : Type*) [Category C] [Category D] :
    Category (C ⥤ D) := inferInstance

-- ============================================================
-- §1.4 Signatures and Free Categories
-- ============================================================

-- Definition 1.18 (Signature / Quiver)
#check Quiver

-- Definition 1.19 (Signature morphism = Prefunctor)
#check Prefunctor

-- Proposition 1.20 (Category of signatures)
-- Quivers with prefunctors don't form a Category instance in Mathlib
-- directly, but the composition and identity are defined.

-- Definition 1.21 (Path)
#check Quiver.Path

-- Definition 1.22 (Free category)
#check Paths  -- CategoryTheory.Paths

-- Proposition 1.23 (Free category is well-defined)
example (V : Type*) [Quiver V] : Category (Paths V) :=
  Paths.categoryPaths V

-- Theorem 1.24 (Universal property of free categories)
#check Paths.lift       -- existence
#check Paths.lift_spec  -- specification
#check Paths.lift_unique -- uniqueness

-- Corollary 1.25 (Free ⊣ U)
-- The adjunction is not directly formalized here but follows from
-- lift + lift_unique (the universal property IS the adjunction data).

-- Proposition 1.26 (Free functor preserves composition)
-- Proved in SignatureCategory.lean as `free_map_comp`.

end AstrolabeCategory.Preliminaries
