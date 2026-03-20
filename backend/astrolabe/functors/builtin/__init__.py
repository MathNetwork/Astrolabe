"""
Built-in functors — always registered, not scanned from .astrolabe/functors/.
"""
from fastapi import FastAPI

from ..base import AstrolabeFunctor


_ANALYSIS_ENDPOINTS = [
    {"key": "pagerank",          "path": "/api/project/analysis/pagerank",          "label": "PageRank",             "type": "size"},
    {"key": "indegree",          "path": "/api/project/analysis/degree",            "label": "Degree",               "type": "size"},
    {"key": "betweenness",       "path": "/api/project/analysis/betweenness",       "label": "Betweenness",          "type": "size"},
    {"key": "katz",              "path": "/api/project/analysis/katz",              "label": "Katz",                 "type": "size"},
    {"key": "communities",       "path": "/api/project/analysis/communities",       "label": "Community",            "type": "color"},
    {"key": "spectralClusters",  "path": "/api/project/analysis/spectral",          "label": "Spectral",             "type": "color"},
    {"key": "curvature",         "path": "/api/project/analysis/curvature",         "label": "Curvature",            "type": "color"},
    {"key": "depths",            "path": "/api/project/analysis/dag",               "label": "DAG Depth",            "type": "size"},
    {"key": "clustering",        "path": "/api/project/analysis/clustering",        "label": "Clustering",           "type": "size"},
    {"key": "structural",        "path": "/api/project/analysis/structural",        "label": "Structural",           "type": "size"},
    {"key": "entropy",           "path": "/api/project/analysis/entropy",           "label": "Entropy",              "type": "info"},
    {"key": "topology",          "path": "/api/project/analysis/topology",          "label": "Topology",             "type": "info"},
    {"key": "statistics",        "path": "/api/project/analysis/statistics",         "label": "Statistics",           "type": "info"},
    {"key": "correlations",      "path": "/api/project/analysis/correlations",       "label": "Correlations",         "type": "info"},
    {"key": "embedding",         "path": "/api/project/analysis/embedding",          "label": "Embedding",            "type": "info"},
    {"key": "patterns",          "path": "/api/project/analysis/patterns",           "label": "Patterns",             "type": "info"},
    {"key": "linkPrediction",    "path": "/api/project/analysis/link-prediction",    "label": "Link Prediction",      "type": "info"},
    {"key": "mapper",            "path": "/api/project/analysis/mapper",             "label": "Mapper",               "type": "info"},
    {"key": "hierarchical",      "path": "/api/project/analysis/hierarchical",       "label": "Hierarchical",         "type": "color"},
    {"key": "embeddingClusters", "path": "/api/project/analysis/embedding-clusters", "label": "Embedding Clusters",   "type": "color"},
    {"key": "motifParticipation","path": "/api/project/analysis/motif-participation","label": "Motif Participation",  "type": "info"},
    {"key": "metricsAll",        "path": "/api/project/analysis/metrics/all",        "label": "All Metrics",          "type": "info"},
    {"key": "criticalPath",      "path": "/api/project/analysis/critical-path",      "label": "Critical Path",        "type": "info"},
    {"key": "transitiveReduction","path": "/api/project/analysis/transitive-reduction","label": "Transitive Reduction","type": "info"},
]

BUILTIN_FUNCTORS = [
    AstrolabeFunctor(
        name="Network Analysis",
        version="0.1.0",
        description="Network analysis algorithms for knowledge graphs: centrality, community detection, clustering, topological analysis, path analysis, and more.",
        author="Xinze-Li-Moqian",
        updated_at="2026-03-19",
        icon="chart-bar",
        skills=[],
        analysis_endpoints=_ANALYSIS_ENDPOINTS,
    ),
    AstrolabeFunctor(
        name="Lean Import Functor",
        version="0.1.0",
        description="Import Lean 4 .ilean compilation artifacts into Astrolabe knowledge graph. Parses declarations, dependencies, and sorry status.",
        author="Xinze-Li-Moqian",
        updated_at="2026-03-19",
        icon="code-bracket",
        skills=[],
        analysis_endpoints=[],
    ),
]


def register_builtin_functors(app: FastAPI):
    """Register all built-in functors with the app."""
    from .lean.router import router as lean_router
    app.include_router(lean_router, prefix="/api/functors/lean")
    BUILTIN_FUNCTORS[1].router = lean_router
