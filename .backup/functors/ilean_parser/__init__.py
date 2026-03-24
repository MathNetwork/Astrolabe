from ..base import AstrolabeFunctor

FUNCTOR_INFO = AstrolabeFunctor(
    name="ilean Parser",
    version="0.1.0",
    description="Parses Lean 4 .ilean compilation artifacts into the signature — declarations become objects, dependency edges become morphisms.",
    signature=r"$F_{\text{ilean}}: \mathbf{Lean} \to \mathcal{A}(\Sigma)$ — maps .ilean declarations to objects and uses-edges to morphisms",
    author="Xinze-Li-Moqian",
    updated_at="2026-03-20",
    icon="code-bracket",
    skills=[],
    analysis_endpoints=[],
)
