"""
Network Analysis Module for Astrolabe

Provides graph-theoretic analysis of signatures:
- Degree distribution and statistics
- Centrality measures (PageRank, Betweenness)
- Clustering coefficients
- Community detection (Louvain)
- Graph entropy (Von Neumann, Shannon)
- DAG-specific analysis (depth, layers, bottlenecks, critical path)
"""

from .graph_builder import build_networkx_graph, GraphStats
from .degree import (
    compute_degree_distribution,
    compute_degree_statistics,
    compute_degree_shannon_entropy,
)
from .centrality import (
    compute_pagerank,
    compute_betweenness_centrality,
)
from .clustering import (
    compute_clustering_coefficients,
    compute_namespace_clustering,
)
from .community import (
    detect_communities_louvain,
    compute_modularity,
)
from .entropy import (
    compute_von_neumann_entropy,
    compute_structure_entropy,
)
from .dag import (
    compute_dependency_depth,
    compute_topological_layers,
    get_nodes_by_layer,
    find_sources,
    find_sinks,
    compute_source_sink_stats,
    compute_proof_width,
    compute_bottleneck_scores,
    compute_reachability_count,
    find_critical_path,
    find_critical_path_to,
    compute_graph_depth,
    analyze_dag,
)
from .structural import (
    find_bridges,
    find_articulation_points,
    compute_hits,
    get_top_hubs,
    get_top_authorities,
    compute_katz_centrality,
    analyze_structure,
)
from .advanced import (
    compute_transitive_reduction,
    get_transitive_edges,
    compute_hierarchical_clustering,
    cut_dendrogram,
    compute_spectral_clustering,
    compute_fiedler_vector,
    analyze_advanced,
)

# New analysis modules (P0/P1/P2)
from .statistics import (
    fit_degree_distribution,
    compute_metric_correlations,
    compute_degree_assortativity,
    detect_zscore_anomalies,
    detect_mahalanobis_anomalies,
    detect_lof_anomalies,
    detect_isolation_forest_anomalies,
    analyze_statistics,
)
from .link_prediction import (
    predict_links,
    predict_links_for_node,
    predict_links_ensemble,
    analyze_link_prediction,
)
from .optimal_transport import (
    compute_forman_ricci,
    compute_ollivier_ricci,
    compute_wasserstein_distance,
    compare_degree_distributions,
    analyze_curvature,
)
from .geometry import (
    compute_laplacian,
    compute_laplacian_spectrum,
    compute_heat_kernel,
    compute_heat_kernel_signature,
    compute_diffusion_distance,
    compute_commute_time_distance,
    analyze_geometry,
)
from .topology import (
    compute_betti_numbers,
    compute_persistent_homology,
    compute_persistence_entropy,
    compute_persistence_landscape,
    compute_mapper,
    analyze_topology,
)
from .embedding import (
    compute_spectral_embedding,
    compute_node2vec_embedding,
    compute_diffusion_map,
    reduce_to_visualization,
    compute_feature_embedding,
    analyze_embedding,
)
from .pattern import (
    count_motifs_3node,
    count_motifs_4node,
    compute_motif_significance,
    find_pattern_instances,
    find_proof_patterns,
    analyze_patterns,
)

__all__ = [
    # Graph builder
    "build_networkx_graph",
    "GraphStats",
    # Degree
    "compute_degree_distribution",
    "compute_degree_statistics",
    "compute_degree_shannon_entropy",
    # Centrality
    "compute_pagerank",
    "compute_betweenness_centrality",
    # Clustering
    "compute_clustering_coefficients",
    "compute_namespace_clustering",
    # Community
    "detect_communities_louvain",
    "compute_modularity",
    # Entropy
    "compute_von_neumann_entropy",
    "compute_structure_entropy",
    # DAG analysis
    "compute_dependency_depth",
    "compute_topological_layers",
    "get_nodes_by_layer",
    "find_sources",
    "find_sinks",
    "compute_source_sink_stats",
    "compute_proof_width",
    "compute_bottleneck_scores",
    "compute_reachability_count",
    "find_critical_path",
    "find_critical_path_to",
    "compute_graph_depth",
    "analyze_dag",
    # Structural analysis
    "find_bridges",
    "find_articulation_points",
    "compute_hits",
    "get_top_hubs",
    "get_top_authorities",
    "compute_katz_centrality",
    "analyze_structure",
    # Advanced analysis
    "compute_transitive_reduction",
    "get_transitive_edges",
    "compute_hierarchical_clustering",
    "cut_dendrogram",
    "compute_spectral_clustering",
    "compute_fiedler_vector",
    "analyze_advanced",
    # Statistics
    "fit_degree_distribution",
    "compute_metric_correlations",
    "compute_degree_assortativity",
    "detect_zscore_anomalies",
    "detect_mahalanobis_anomalies",
    "detect_lof_anomalies",
    "detect_isolation_forest_anomalies",
    "analyze_statistics",
    # Link prediction
    "predict_links",
    "predict_links_for_node",
    "predict_links_ensemble",
    "analyze_link_prediction",
    # Optimal transport / Ricci curvature
    "compute_forman_ricci",
    "compute_ollivier_ricci",
    "compute_wasserstein_distance",
    "compare_degree_distributions",
    "analyze_curvature",
    # Geometry
    "compute_laplacian",
    "compute_laplacian_spectrum",
    "compute_heat_kernel",
    "compute_heat_kernel_signature",
    "compute_diffusion_distance",
    "compute_commute_time_distance",
    "analyze_geometry",
    # Topology
    "compute_betti_numbers",
    "compute_persistent_homology",
    "compute_persistence_entropy",
    "compute_persistence_landscape",
    "compute_mapper",
    "analyze_topology",
    # Embedding
    "compute_spectral_embedding",
    "compute_node2vec_embedding",
    "compute_diffusion_map",
    "reduce_to_visualization",
    "compute_feature_embedding",
    "analyze_embedding",
    # Pattern recognition
    "count_motifs_3node",
    "count_motifs_4node",
    "compute_motif_significance",
    "find_pattern_instances",
    "find_proof_patterns",
    "analyze_patterns",
    # Functor metadata
    "ANALYSIS_ENDPOINTS",
    "FUNCTOR_INFO",
]

from ..base import AstrolabeFunctor

ANALYSIS_ENDPOINTS = [
    {"key": "pagerank",          "path": "/api/project/analysis/pagerank",          "label": "PageRank",             "type": "size",  "params": "top_k=10000"},
    {"key": "indegree",          "path": "/api/project/analysis/degree",            "label": "Degree",               "type": "size"},
    {"key": "betweenness",       "path": "/api/project/analysis/betweenness",       "label": "Betweenness",          "type": "size",  "params": "include_all=true"},
    {"key": "katz",              "path": "/api/project/analysis/katz",              "label": "Katz",                 "type": "size"},
    {"key": "communities",       "path": "/api/project/analysis/communities",       "label": "Community",            "type": "color"},
    {"key": "spectralClusters",  "path": "/api/project/analysis/spectral",          "label": "Spectral",             "type": "color", "params": "n_clusters=8"},
    {"key": "curvature",         "path": "/api/project/analysis/curvature",         "label": "Curvature",            "type": "color", "params": "include_node_curvatures=true"},
    {"key": "depths",            "path": "/api/project/analysis/dag",               "label": "DAG Depth",            "type": "size",  "params": "include_all_depths=true&include_all_scores=true"},
    {"key": "clustering",        "path": "/api/project/analysis/clustering",        "label": "Clustering",           "type": "size",  "params": "include_local=true"},
    {"key": "structural",        "path": "/api/project/analysis/structural",        "label": "Structural",           "type": "size"},
    {"key": "entropy",           "path": "/api/project/analysis/entropy",           "label": "Entropy",              "type": "info"},
    {"key": "topology",          "path": "/api/project/analysis/topology",          "label": "Topology",             "type": "info",  "params": "include_persistent_homology=true"},
    {"key": "statistics",        "path": "/api/project/analysis/statistics",         "label": "Statistics",           "type": "info"},
    {"key": "correlations",      "path": "/api/project/analysis/correlations",       "label": "Correlations",         "type": "info"},
    {"key": "embedding",         "path": "/api/project/analysis/embedding",          "label": "Embedding",            "type": "info"},
    {"key": "patterns",          "path": "/api/project/analysis/patterns",           "label": "Patterns",             "type": "info"},
    {"key": "linkPrediction",    "path": "/api/project/analysis/link-prediction",    "label": "Link Prediction",      "type": "info"},
    {"key": "mapper",            "path": "/api/project/analysis/mapper",             "label": "Mapper",               "type": "info"},
    {"key": "hierarchical",      "path": "/api/project/analysis/hierarchical",       "label": "Hierarchical",         "type": "color"},
    {"key": "embeddingClusters", "path": "/api/project/analysis/embedding-clusters", "label": "Embedding Clusters",   "type": "color", "params": "n_clusters=8"},
    {"key": "motifParticipation","path": "/api/project/analysis/motif-participation","label": "Motif Participation",  "type": "info"},
    {"key": "metricsAll",        "path": "/api/project/analysis/metrics/all",        "label": "All Metrics",          "type": "info"},
    # criticalPath requires a target node param, not a global analysis
    {"key": "transitiveReduction","path": "/api/project/analysis/transitive-reduction","label": "Transitive Reduction","type": "info"},
]

FUNCTOR_INFO = AstrolabeFunctor(
    name="Network Analysis",
    version="0.1.0",
    description="Network analysis algorithms for signatures: centrality, community detection, clustering, topological analysis, path analysis, and more.",
    signature=r"$A: \mathcal{A}(\Sigma)_{\mathcal{M}} \to \mathcal{A}(\Sigma)_{\mathcal{M}'}$ — computes graph-theoretic metrics over the morphism structure",
    author="Xinze-Li-Moqian",
    updated_at="2026-03-19",
    icon="chart-bar",
    skills=[],
    analysis_endpoints=ANALYSIS_ENDPOINTS,
)
