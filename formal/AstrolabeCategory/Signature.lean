import Mathlib.CategoryTheory.Category.Basic

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

end AstrolabeCategory
