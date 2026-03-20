"""
Analysis Router — all graph analysis endpoints.

Extracted from server.py to keep core routes separate from analysis functors.
All routes maintain their original paths under /api/project/analysis/.
"""
import networkx as nx
from fastapi import APIRouter, HTTPException, Query

from ...signature_storage import SignatureStorage
from . import (
    build_networkx_graph,
    compute_degree_statistics,
    compute_pagerank,
    compute_betweenness_centrality,
    detect_communities_louvain,
    compute_clustering_coefficients,
    compute_von_neumann_entropy,
    compute_structure_entropy,
)
from .entropy import random_graph_baseline
from .degree import compute_degree_shannon_entropy

router = APIRouter()

# Storage helper — import from server at registration time
_get_signature_store = None

def set_signature_store_getter(fn):
    """Called by server.py to inject _get_signature_store."""
    global _get_signature_store
    _get_signature_store = fn

_graph_cache: dict[str, tuple[nx.DiGraph, float]] = {}  # path -> (graph, timestamp)
GRAPH_CACHE_TTL = 60  # seconds


def _get_or_build_graph(path: str) -> nx.DiGraph:
    """Get cached NetworkX graph or build a new one from knowledge storage"""
    import time as time_module
    now = time_module.time()

    # Check cache
    if path in _graph_cache:
        cached_graph, timestamp = _graph_cache[path]
        if now - timestamp < GRAPH_CACHE_TTL:
            return cached_graph

    # Build new graph from signature storage
    storage = _get_signature_store(path)
    nodes = storage.get_all_objs()
    edges = storage.get_all_mors()
    G = build_networkx_graph(nodes, edges, directed=True)

    # Cache it
    _graph_cache[path] = (G, now)
    return G


@router.get("/api/project/analysis/degree")
async def get_degree_analysis(
    path: str = Query(..., description="Project path"),
    top_k: int = Query(20, description="Number of top nodes to return"),
):
    """
    Get degree distribution analysis for the project graph.

    Returns:
        - inDegree: Incoming edge statistics (how many dependencies each node has)
        - outDegree: Outgoing edge statistics (how many nodes depend on each)
        - totalDegree: Combined degree statistics
        - topInDegree: Nodes with most incoming edges (most dependencies)
        - topOutDegree: Nodes with most outgoing edges (most depended upon)
        - shannonEntropy: Entropy of the degree distribution
    """
    G = _get_or_build_graph(path)
    stats = compute_degree_statistics(G, top_k=top_k)

    return {
        "status": "ok",
        "analysis": "degree",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": stats.to_dict(),
    }


@router.get("/api/project/analysis/pagerank")
async def get_pagerank_analysis(
    path: str = Query(..., description="Project path"),
    alpha: float = Query(0.85, description="Damping factor (0-1)"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_all: bool = Query(False, description="Include all node values (can be large)"),
):
    """
    Get PageRank centrality analysis for the project graph.

    PageRank identifies the most "important" nodes based on link structure.
    In Lean projects, high PageRank indicates foundational theorems/lemmas
    that are referenced by many other important results.

    Args:
        path: Project path
        alpha: Damping factor (default 0.85, higher = more weight on link structure)
        top_k: Number of top nodes to return
        include_all: If True, include centrality values for all nodes

    Returns:
        - topNodes: List of top k nodes by PageRank
        - mean: Mean PageRank value
        - maxValue: Maximum PageRank value
        - minValue: Minimum PageRank value
        - values: (optional) All node PageRank values
    """
    G = _get_or_build_graph(path)
    result = compute_pagerank(G, alpha=alpha, top_k=top_k)

    response_data = {
        "topNodes": [{"nodeId": n, "value": v} for n, v in result.top_nodes],
        "mean": result.mean,
        "maxValue": result.max_value,
        "minValue": result.min_value,
    }

    if include_all:
        response_data["values"] = result.values

    return {
        "status": "ok",
        "analysis": "pagerank",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "alpha": alpha,
        "data": response_data,
    }


@router.get("/api/project/analysis/betweenness")
async def get_betweenness_analysis(
    path: str = Query(..., description="Project path"),
    k: int = Query(1000, description="Number of samples for approximation (0 = exact)"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_all: bool = Query(False, description="Include all node values (can be large)"),
):
    """
    Get Betweenness centrality analysis for the project graph.

    Betweenness measures how often a node lies on shortest paths between other nodes.
    High betweenness indicates "bridge" nodes that connect different parts of the graph.

    In Lean projects, high betweenness indicates lemmas that bridge different
    mathematical domains - "connector" results that link different areas.

    Args:
        path: Project path
        k: Number of random samples for approximation (default 1000, 0 = exact calculation)
        top_k: Number of top nodes to return
        include_all: If True, include centrality values for all nodes

    Returns:
        - topNodes: List of top k nodes by betweenness
        - mean: Mean betweenness value
        - maxValue: Maximum betweenness value
        - minValue: Minimum betweenness value
        - values: (optional) All node betweenness values
    """
    G = _get_or_build_graph(path)

    # k=0 means exact calculation
    sample_k = k if k > 0 else None
    result = compute_betweenness_centrality(G, k=sample_k, top_k=top_k)

    response_data = {
        "topNodes": [{"nodeId": n, "value": v} for n, v in result.top_nodes],
        "mean": result.mean,
        "maxValue": result.max_value,
        "minValue": result.min_value,
    }

    if include_all:
        response_data["values"] = result.values

    return {
        "status": "ok",
        "analysis": "betweenness",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "sampled": sample_k is not None,
        "sampleSize": sample_k,
        "data": response_data,
    }


@router.get("/api/project/analysis/communities")
async def get_community_detection(
    path: str = Query(..., description="Project path"),
    resolution: float = Query(1.0, description="Resolution parameter (higher = more communities)"),
    include_partition: bool = Query(False, description="Include full node->community mapping"),
    include_members: bool = Query(True, description="Include community member lists"),
    top_k: int = Query(10, description="Number of top communities to show members for"),
):
    """
    Detect communities using the Louvain algorithm.

    Communities are groups of densely connected nodes. In Lean projects,
    they represent clusters of related mathematical concepts.

    Args:
        path: Project path
        resolution: Higher = more smaller communities, lower = fewer larger communities
        include_partition: If True, include full node->community_id mapping
        include_members: If True, include member lists for top communities
        top_k: Number of top communities to include member lists for

    Returns:
        - numCommunities: Total number of communities found
        - modularity: Quality score (0-1, higher = better separation)
        - sizes: List of community sizes (sorted descending)
        - communities: (optional) Top k communities with member lists
        - partition: (optional) Full node->community_id mapping
    """
    G = _get_or_build_graph(path)
    result = detect_communities_louvain(G, resolution=resolution)

    # Build response
    response_data = {
        "numCommunities": result.num_communities,
        "modularity": result.modularity,
        "sizes": result.sizes,
    }

    # Include top k communities with members
    if include_members:
        # Sort communities by size
        sorted_communities = sorted(
            result.communities.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )
        top_communities = []
        for comm_id, members in sorted_communities[:top_k]:
            top_communities.append({
                "id": comm_id,
                "size": len(members),
                "members": members,
            })
        response_data["topCommunities"] = top_communities

    if include_partition:
        response_data["partition"] = result.partition

    return {
        "status": "ok",
        "analysis": "communities",
        "algorithm": "louvain",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "resolution": resolution,
        "data": response_data,
    }


@router.get("/api/project/analysis/clustering")
async def get_clustering_analysis(
    path: str = Query(..., description="Project path"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_local: bool = Query(False, description="Include all local coefficients (can be large)"),
    include_namespaces: bool = Query(True, description="Include clustering by namespace"),
):
    """
    Get clustering coefficient analysis for the project graph.

    The clustering coefficient measures how much nodes tend to cluster together.
    - Global (transitivity): Fraction of possible triangles that exist
    - Local: For each node, what fraction of its neighbors are also connected
    - By namespace: Average clustering within each namespace

    In Lean projects, high clustering indicates tightly interconnected groups
    of lemmas representing cohesive mathematical topics.

    Args:
        path: Project path
        top_k: Number of top clustered nodes to return
        include_local: If True, include local coefficients for all nodes
        include_namespaces: If True, include clustering breakdown by namespace

    Returns:
        - globalCoefficient: Graph-wide transitivity
        - averageCoefficient: Mean of local coefficients
        - topNodes: Nodes with highest local clustering
        - byNamespace: (optional) Average clustering per namespace
        - local: (optional) All local coefficients
    """
    G = _get_or_build_graph(path)
    result = compute_clustering_coefficients(G, include_local=True)

    # Get top-k nodes by local clustering (filter out nodes with degree < 2)
    G_undirected = G.to_undirected() if G.is_directed() else G
    degrees = dict(G_undirected.degree())

    # Sort nodes by clustering, filter by min degree
    sorted_nodes = sorted(
        [(n, c) for n, c in result.local.items() if degrees.get(n, 0) >= 2],
        key=lambda x: x[1],
        reverse=True
    )
    top_nodes = [{"nodeId": n, "value": c, "degree": degrees.get(n, 0)}
                 for n, c in sorted_nodes[:top_k]]

    # Build response
    response_data = {
        "globalCoefficient": result.global_coefficient,
        "averageCoefficient": result.average_coefficient,
        "topNodes": top_nodes,
    }

    if include_namespaces:
        # Sort namespaces by clustering coefficient
        sorted_ns = sorted(
            result.by_namespace.items(),
            key=lambda x: x[1],
            reverse=True
        )
        response_data["byNamespace"] = [
            {"namespace": ns, "avgClustering": c, "nodeCount": sum(1 for n in result.local if n.startswith(ns + "."))}
            for ns, c in sorted_ns[:50]  # Top 50 namespaces
        ]

    if include_local:
        response_data["local"] = result.local

    return {
        "status": "ok",
        "analysis": "clustering",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@router.get("/api/project/analysis/entropy")
async def get_project_entropy(
    path: str = Query(..., description="Project path"),
    num_eigenvalues: int = Query(100, description="Number of eigenvalues for Von Neumann entropy"),
    random_samples: int = Query(5, description="Number of random graph samples for baseline"),
):
    """
    Compute entropy metrics for the project's dependency graph.

    Returns:
        - vonNeumann: Von Neumann entropy (based on graph Laplacian)
        - shannon: Shannon entropy (based on degree distribution)
        - effectiveDimension: exp(Von Neumann entropy)
        - randomBaseline: Entropy of equivalent random graph (same n, m)
        - normalizedEntropy: Von Neumann entropy / random baseline entropy
    """
    G = _get_or_build_graph(path)
    n = G.number_of_nodes()
    m = G.number_of_edges()

    # Compute Von Neumann entropy
    vn_result = compute_von_neumann_entropy(G, num_eigenvalues=num_eigenvalues)
    vn_entropy = vn_result["vonNeumannEntropy"]
    vn_effective_dim = vn_result["effectiveDimension"]
    vn_num_eigenvalues = len(vn_result["eigenvalues"])

    # Compute Shannon entropy from degree distribution
    shannon_entropy = compute_degree_shannon_entropy(G)

    # Compute random graph baseline
    baseline = random_graph_baseline(n, m, num_samples=random_samples)
    baseline_vn_mean = baseline["vonNeumann"]["mean"]
    baseline_vn_std = baseline["vonNeumann"]["std"]

    # Normalized entropy (compared to random graph)
    normalized = vn_entropy / baseline_vn_mean if baseline_vn_mean > 0 else 0.0

    return {
        "status": "ok",
        "analysis": "entropy",
        "numNodes": n,
        "numEdges": m,
        "data": {
            "vonNeumann": {
                "entropy": vn_entropy,
                "numEigenvalues": vn_num_eigenvalues,
                "effectiveDimension": vn_effective_dim,
            },
            "shannon": {
                "entropy": shannon_entropy,
                "description": "Entropy of degree distribution",
            },
            "randomBaseline": {
                "meanEntropy": baseline_vn_mean,
                "stdEntropy": baseline_vn_std,
                "numSamples": baseline["numSamples"],
            },
            "normalizedEntropy": normalized,
            "interpretation": (
                "low" if normalized < 0.8 else
                "medium" if normalized < 1.2 else
                "high"
            ),
        },
    }


@router.get("/api/project/analysis/dag")
async def get_dag_analysis(
    path: str = Query(..., description="Project path"),
    include_all_depths: bool = Query(False, description="Include depth for all nodes"),
    include_all_scores: bool = Query(False, description="Include bottleneck scores for all nodes"),
    top_k: int = Query(20, description="Number of top nodes to return for each metric"),
):
    """
    Get DAG-specific analysis for the project dependency graph.

    DAG analysis is specialized for formal mathematics dependency structures,
    providing insights into proof depth, bottlenecks, and critical paths.

    Returns:
        - sources: Root nodes (axioms, definitions with no dependencies)
        - sinks: Terminal nodes (not used by other theorems)
        - graphDepth: Length of the longest dependency chain
        - criticalPath: The longest dependency chain (node IDs)
        - layers: Number of topological layers
        - topDeepNodes: Nodes with highest dependency depth
        - topBottlenecks: Nodes with highest bottleneck score
        - topReachability: Nodes that can reach the most other nodes
    """
    from .dag import (
        analyze_dag,
        compute_dependency_depth,
        compute_bottleneck_scores,
        compute_reachability_count,
    )

    G = _get_or_build_graph(path)

    # Run full DAG analysis
    result = analyze_dag(G)

    if not result.get("is_dag", False):
        return {
            "status": "error",
            "analysis": "dag",
            "error": result.get("error", "Graph contains cycles"),
            "numNodes": G.number_of_nodes(),
            "numEdges": G.number_of_edges(),
        }

    # Prepare top nodes by depth
    depths = result["depths"]
    sorted_by_depth = sorted(depths.items(), key=lambda x: -x[1])[:top_k]

    # Prepare top bottlenecks
    bottlenecks = result["bottleneck_scores"]
    sorted_bottlenecks = sorted(bottlenecks.items(), key=lambda x: -x[1])[:top_k]

    # Prepare top reachability
    reachability = result["reachability"]
    sorted_reachability = sorted(reachability.items(), key=lambda x: -x[1])[:top_k]

    response_data = {
        "isDAG": True,
        "sources": result["sources"],
        "sinks": result["sinks"],
        "numSources": result["num_sources"],
        "numSinks": result["num_sinks"],
        "graphDepth": result["graph_depth"],
        "numLayers": result["num_layers"],
        "criticalPath": result["critical_path"],
        "topDeepNodes": [{"nodeId": n, "depth": d} for n, d in sorted_by_depth],
        "topBottlenecks": [{"nodeId": n, "score": s} for n, s in sorted_bottlenecks],
        "topReachability": [{"nodeId": n, "count": c} for n, c in sorted_reachability],
    }

    if include_all_depths:
        response_data["allDepths"] = depths

    if include_all_scores:
        response_data["allBottleneckScores"] = bottlenecks
        response_data["allReachability"] = reachability

    return {
        "status": "ok",
        "analysis": "dag",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@router.get("/api/project/analysis/critical-path")
async def get_critical_path_to_node(
    path: str = Query(..., description="Project path"),
    target: str = Query(..., description="Target node ID"),
):
    """
    Find the critical path (longest dependency chain) to a specific node.

    This answers: "What is the deepest dependency chain to understand this theorem?"

    Returns:
        - path: List of node IDs forming the longest path to target
        - length: Number of edges in the path
    """
    from .dag import find_critical_path_to

    G = _get_or_build_graph(path)

    try:
        critical_path = find_critical_path_to(G, target)
        return {
            "status": "ok",
            "analysis": "critical-path",
            "target": target,
            "data": {
                "path": critical_path,
                "length": len(critical_path) - 1 if critical_path else 0,
            },
        }
    except ValueError as e:
        return {
            "status": "error",
            "analysis": "critical-path",
            "target": target,
            "error": str(e),
        }


@router.get("/api/project/analysis/structural")
async def get_structural_analysis(
    path: str = Query(..., description="Project path"),
    top_k: int = Query(20, description="Number of top nodes to return"),
):
    """
    Get structural analysis: bridges, articulation points, HITS scores.

    Identifies critical structural elements in the dependency graph:
    - Bridges: edges whose removal disconnects the graph
    - Articulation points: nodes whose removal disconnects the graph
    - HITS: hub and authority scores

    Returns:
        - bridges: List of bridge edges
        - articulationPoints: List of articulation point node IDs
        - topHubs: Nodes with highest hub scores (comprehensive proofs)
        - topAuthorities: Nodes with highest authority scores (fundamental theorems)
    """
    from .structural import (
        find_bridges,
        find_articulation_points,
        get_top_hubs,
        get_top_authorities,
    )

    G = _get_or_build_graph(path)

    bridges = find_bridges(G)
    ap = find_articulation_points(G)
    top_hubs = get_top_hubs(G, k=top_k)
    top_authorities = get_top_authorities(G, k=top_k)

    return {
        "status": "ok",
        "analysis": "structural",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": {
            "bridges": [{"source": s, "target": t} for s, t in bridges],
            "numBridges": len(bridges),
            "articulationPoints": ap,
            "numArticulationPoints": len(ap),
            "topHubs": [{"nodeId": n, "score": s} for n, s in top_hubs],
            "topAuthorities": [{"nodeId": n, "score": s} for n, s in top_authorities],
        },
    }


@router.get("/api/project/analysis/katz")
async def get_katz_centrality(
    path: str = Query(..., description="Project path"),
    alpha: float = Query(0.1, description="Attenuation factor"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_all: bool = Query(False, description="Include all node values"),
):
    """
    Get Katz centrality analysis.

    Katz centrality measures influence based on total walks from a node.
    Better suited for DAGs than PageRank as it handles sink nodes.

    Args:
        alpha: Attenuation factor (lower = less influence from distant nodes)
        top_k: Number of top nodes to return

    Returns:
        - topNodes: Nodes with highest Katz centrality
        - values: (optional) All node values
    """
    from .structural import compute_katz_centrality

    G = _get_or_build_graph(path)

    katz = compute_katz_centrality(G, alpha=alpha)
    sorted_katz = sorted(katz.items(), key=lambda x: -x[1])[:top_k]

    response_data = {
        "topNodes": [{"nodeId": n, "value": v} for n, v in sorted_katz],
    }

    if include_all:
        response_data["values"] = katz

    return {
        "status": "ok",
        "analysis": "katz",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "alpha": alpha,
        "data": response_data,
    }


@router.get("/api/project/analysis/transitive-reduction")
async def get_transitive_reduction(
    path: str = Query(..., description="Project path"),
):
    """
    Get transitive reduction of the dependency graph.

    Identifies redundant (transitive) edges that can be removed
    without changing reachability. Useful for simplifying visualization.

    Returns:
        - transitiveEdges: List of edges that are redundant
        - numTransitiveEdges: Count of transitive edges
        - reductionRatio: Percentage of edges that are transitive
    """
    from .advanced import get_transitive_edges

    G = _get_or_build_graph(path)

    transitive = get_transitive_edges(G)
    total_edges = G.number_of_edges()
    reduction_ratio = len(transitive) / total_edges if total_edges > 0 else 0

    return {
        "status": "ok",
        "analysis": "transitive-reduction",
        "numNodes": G.number_of_nodes(),
        "numEdges": total_edges,
        "data": {
            "transitiveEdges": [{"source": s, "target": t} for s, t in transitive],
            "numTransitiveEdges": len(transitive),
            "reductionRatio": reduction_ratio,
            "essentialEdges": total_edges - len(transitive),
        },
    }


@router.get("/api/project/analysis/spectral")
async def get_spectral_clustering(
    path: str = Query(..., description="Project path"),
    n_clusters: int = Query(5, description="Number of clusters"),
):
    """
    Perform spectral clustering on the dependency graph.

    Uses graph Laplacian eigenvectors for clustering.
    May reveal structure that Louvain misses.

    Returns:
        - clusters: Mapping of node ID to cluster ID
        - numClusters: Number of clusters found
        - fiedlerVector: (optional) 2nd eigenvector for 2-way partitioning
    """
    from .advanced import compute_spectral_clustering, compute_fiedler_vector

    G = _get_or_build_graph(path)

    clusters = compute_spectral_clustering(G, n_clusters=n_clusters)

    # Group nodes by cluster
    cluster_members = {}
    for node, cid in clusters.items():
        if cid not in cluster_members:
            cluster_members[cid] = []
        cluster_members[cid].append(node)

    return {
        "status": "ok",
        "analysis": "spectral",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "nClusters": n_clusters,
        "data": {
            "clusters": clusters,
            "numClusters": len(cluster_members),
            "clusterSizes": {cid: len(members) for cid, members in cluster_members.items()},
        },
    }


@router.get("/api/project/analysis/hierarchical")
async def get_hierarchical_clustering(
    path: str = Query(..., description="Project path"),
    n_clusters: int = Query(5, description="Number of clusters to cut"),
):
    """
    Perform hierarchical clustering on the dependency graph.

    Produces nested community structure (dendrogram).

    Returns:
        - clusters: Flat clustering at specified level
        - numClusters: Number of clusters
    """
    from .advanced import compute_hierarchical_clustering, cut_dendrogram

    G = _get_or_build_graph(path)

    result = compute_hierarchical_clustering(G)

    if len(result["labels"]) <= 1:
        clusters = {label: 0 for label in result["labels"]}
    else:
        clusters = cut_dendrogram(
            result["dendrogram"],
            result["labels"],
            n_clusters=n_clusters
        )

    # Group nodes by cluster
    cluster_members = {}
    for node, cid in clusters.items():
        if cid not in cluster_members:
            cluster_members[cid] = []
        cluster_members[cid].append(node)

    return {
        "status": "ok",
        "analysis": "hierarchical",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "nClusters": n_clusters,
        "data": {
            "clusters": clusters,
            "numClusters": len(cluster_members),
            "clusterSizes": {cid: len(members) for cid, members in cluster_members.items()},
        },
    }


# ============================================
# Advanced Analysis API (Statistics, Curvature, Geometry, Topology)
# ============================================


@router.get("/api/project/analysis/statistics")
async def get_statistics_analysis(
    path: str = Query(..., description="Project path"),
    fit_distribution: bool = Query(True, description="Fit power law to degree distribution"),
    compute_correlations: bool = Query(True, description="Compute metric correlations"),
    detect_anomalies_flag: bool = Query(True, description="Detect anomalous nodes"),
    anomaly_threshold: float = Query(3.0, description="Z-score threshold for anomaly detection"),
    top_k: int = Query(20, description="Number of top anomalies to return"),
):
    """
    Comprehensive statistical analysis of the graph.

    Returns:
        - powerLaw: Power law fit results (alpha, xmin, p-value)
        - correlations: Correlation matrix between centrality metrics
        - assortativity: Degree correlation coefficient
        - anomalies: Nodes with unusual metric combinations
    """
    from .statistics import (
        fit_degree_distribution,
        compute_metric_correlations,
        compute_degree_assortativity,
        detect_zscore_anomalies,
    )

    G = _get_or_build_graph(path)
    result = {}

    # Power law fit
    if fit_distribution:
        result["powerLaw"] = fit_degree_distribution(G)

    # Metric correlations
    if compute_correlations:
        pagerank = nx.pagerank(G)
        betweenness = nx.betweenness_centrality(G)
        in_degree = dict(G.in_degree()) if G.is_directed() else dict(G.degree())
        out_degree = dict(G.out_degree()) if G.is_directed() else dict(G.degree())

        metrics = {
            "pagerank": pagerank,
            "betweenness": betweenness,
            "in_degree": in_degree,
            "out_degree": out_degree,
        }
        result["correlations"] = compute_metric_correlations(metrics)

    # Assortativity
    result["assortativity"] = compute_degree_assortativity(G)

    # Anomaly detection
    if detect_anomalies_flag:
        pagerank = nx.pagerank(G)
        betweenness = nx.betweenness_centrality(G)
        in_degree = dict(G.in_degree()) if G.is_directed() else dict(G.degree())

        metrics = {
            "pagerank": pagerank,
            "betweenness": betweenness,
            "in_degree": in_degree,
        }
        anomaly_result = detect_zscore_anomalies(metrics, threshold=anomaly_threshold)

        # Collect anomalies from all metrics
        all_anomalies = []
        if "by_metric" in anomaly_result:
            for metric_name, metric_data in anomaly_result["by_metric"].items():
                for a in metric_data.get("anomalies", [])[:top_k]:
                    all_anomalies.append({
                        "nodeId": a["node"],
                        "metric": metric_name,
                        "zScore": a["z_score"],
                        "value": a["value"],
                        "direction": a["direction"],
                    })

        # Sort by absolute z-score
        all_anomalies.sort(key=lambda x: abs(x["zScore"]), reverse=True)
        result["anomalies"] = all_anomalies[:top_k]
        result["multiAnomalyNodes"] = anomaly_result.get("multi_anomaly_nodes", [])

    return {
        "status": "ok",
        "analysis": "statistics",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": result,
    }


@router.get("/api/project/analysis/link-prediction")
async def get_link_prediction(
    path: str = Query(..., description="Project path"),
    method: str = Query("adamic_adar", description="Prediction method: common_neighbors, adamic_adar, jaccard, resource_allocation, preferential_attachment"),
    top_k: int = Query(50, description="Number of top predictions to return"),
):
    """
    Predict missing edges in the dependency graph.

    Identifies potential dependencies that may be missing or could be added.
    This is useful for discovering implicit relationships between theorems.

    Returns:
        - predictions: List of predicted edges with scores
    """
    from .link_prediction import predict_links

    G = _get_or_build_graph(path)
    predictions = predict_links(G, method=method, top_k=top_k)

    return {
        "status": "ok",
        "analysis": "link-prediction",
        "method": method,
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": {
            "predictions": predictions,
            "numPredictions": len(predictions),
        },
    }


@router.get("/api/project/analysis/curvature")
async def get_curvature_analysis(
    path: str = Query(..., description="Project path"),
    method: str = Query("forman", description="Curvature method: forman (fast) or ollivier (accurate)"),
    include_edge_curvatures: bool = Query(False, description="Include all edge curvatures"),
    include_node_curvatures: bool = Query(True, description="Include node curvatures"),
    top_k: int = Query(20, description="Number of extreme nodes/edges to return"),
):
    """
    Compute Ricci curvature of the dependency graph.

    Geometric analysis using optimal transport theory:
    - Positive curvature: Tightly clustered regions
    - Negative curvature: Branching points, fundamental lemmas
    - Zero curvature: Linear chains

    Args:
        method: "forman" (O(E), fast) or "ollivier" (O(V*E), accurate)

    Returns:
        - statistics: Mean, std, min, max curvature
        - interpretation: Structural interpretation
        - mostClustered: Nodes/edges with highest positive curvature
        - mostBranching: Nodes/edges with highest negative curvature
    """
    from .optimal_transport import analyze_curvature

    G = _get_or_build_graph(path)
    result = analyze_curvature(G, method=method)

    response_data = {
        "method": result["curvature"].get("method", method),
        "statistics": result["curvature"].get("statistics", {}),
        "interpretation": result["curvature"].get("interpretation", {}),
    }

    # Add highlights
    if "highlights" in result:
        response_data["mostClusteredEdges"] = result["highlights"].get("most_clustered_edges", [])[:top_k]
        response_data["mostBranchingEdges"] = result["highlights"].get("most_branching_edges", [])[:top_k]
        response_data["mostClusteredNodes"] = result["highlights"].get("most_clustered_nodes", [])[:top_k]
        response_data["mostBranchingNodes"] = result["highlights"].get("most_branching_nodes", [])[:top_k]

    if include_node_curvatures and "node_curvatures" in result["curvature"]:
        response_data["nodeCurvatures"] = result["curvature"]["node_curvatures"]

    if include_edge_curvatures and "edge_curvatures" in result["curvature"]:
        response_data["edgeCurvatures"] = result["curvature"]["edge_curvatures"]

    return {
        "status": "ok",
        "analysis": "curvature",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@router.get("/api/project/analysis/geometry")
async def get_geometry_analysis(
    path: str = Query(..., description="Project path"),
    include_spectrum: bool = Query(True, description="Include Laplacian spectrum"),
    include_hks: bool = Query(True, description="Include Heat Kernel Signatures"),
    num_eigenvalues: int = Query(10, description="Number of eigenvalues to compute"),
):
    """
    Geometric analysis using the graph Laplacian.

    Returns:
        - spectrum: Laplacian eigenvalues and Fiedler vector
        - hks: Heat Kernel Signature for multi-scale node analysis
        - algebraicConnectivity: Fiedler value (2nd smallest eigenvalue)
    """
    from .geometry import compute_laplacian_spectrum, compute_heat_kernel_signature

    G = _get_or_build_graph(path)
    response_data = {}

    if include_spectrum:
        spectrum = compute_laplacian_spectrum(G, k=num_eigenvalues)
        response_data["spectrum"] = spectrum

    if include_hks and G.number_of_nodes() <= 2000:
        hks = compute_heat_kernel_signature(G)
        # Only include statistics and top nodes, not full HKS
        if "error" not in hks:
            response_data["hks"] = {
                "timeScales": hks.get("time_scales", []),
                "statistics": hks.get("statistics", {}),
                "interpretation": hks.get("interpretation", ""),
            }
        else:
            response_data["hks"] = hks
    elif include_hks:
        response_data["hks"] = {"note": "Skipped for large graph (>2000 nodes)"}

    return {
        "status": "ok",
        "analysis": "geometry",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@router.get("/api/project/analysis/topology")
async def get_topology_analysis(
    path: str = Query(..., description="Project path"),
    include_persistent_homology: bool = Query(True, description="Include persistent homology (requires gudhi)"),
    filtration: str = Query("degree", description="Filtration type: degree, centrality, distance"),
):
    """
    Topological analysis using TDA methods.

    Returns:
        - bettiNumbers: β₀ (components) and β₁ (cycles)
        - eulerCharacteristic: V - E
        - cyclomaticComplexity: Number of independent cycles
        - persistentHomology: (optional) Persistence diagrams
    """
    from .topology import compute_betti_numbers, compute_persistent_homology

    G = _get_or_build_graph(path)
    response_data = {}

    # Betti numbers (always available)
    betti = compute_betti_numbers(G)
    response_data["bettiNumbers"] = betti

    # Persistent homology (if gudhi available and graph not too large)
    # Note: For graphs with >4000 nodes, computation can be very slow
    max_nodes_for_ph = 4000
    if include_persistent_homology and G.number_of_nodes() <= max_nodes_for_ph:
        ph = compute_persistent_homology(G, filtration=filtration)
        if "error" not in ph and "warning" not in ph:
            response_data["persistentHomology"] = {
                "filtration": ph.get("filtration"),
                "summary": ph.get("summary", {}),
                "bettiCurve": ph.get("betti_curve", []),
                # Include raw diagrams for visualization (P2)
                "diagrams": ph.get("persistence_diagrams", {}),
            }
        else:
            response_data["persistentHomology"] = ph
    elif include_persistent_homology:
        response_data["persistentHomology"] = {"note": f"Skipped: graph too large ({G.number_of_nodes()} > {max_nodes_for_ph} nodes)"}

    return {
        "status": "ok",
        "analysis": "topology",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@router.get("/api/project/analysis/mapper")
async def get_mapper_analysis(
    path: str = Query(..., description="Project path"),
    filter_func: str = Query("degree", description="Filter function: degree, pagerank, closeness, depth"),
    num_intervals: int = Query(10, description="Number of intervals"),
    overlap: float = Query(0.3, description="Overlap fraction (0-0.5)"),
):
    """
    Compute Mapper graph - a simplified topological skeleton. (P2)

    Mapper creates a simplified representation by:
    1. Applying a filter function for 1D projection
    2. Covering with overlapping intervals
    3. Clustering within each interval
    4. Connecting clusters that share points

    Returns:
        - mapperNodes: List of Mapper nodes with members
        - mapperEdges: List of edges between Mapper nodes
        - summary: Statistics about the Mapper graph
    """
    from .topology import compute_mapper

    G = _get_or_build_graph(path)

    if G.number_of_nodes() > 5000:
        return {
            "status": "error",
            "analysis": "mapper",
            "error": "Graph too large for Mapper (>5000 nodes)",
        }

    result = compute_mapper(G, filter_func=filter_func, num_intervals=num_intervals, overlap=overlap)

    if "error" in result:
        return {
            "status": "error",
            "analysis": "mapper",
            "error": result["error"],
        }

    return {
        "status": "ok",
        "analysis": "mapper",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": {
            "filterFunction": result.get("filter_function"),
            "mapperNodes": result.get("mapper_nodes", []),
            "mapperEdges": result.get("mapper_edges", []),
            "summary": result.get("summary", {}),
            "interpretation": result.get("interpretation", ""),
        },
    }


@router.get("/api/project/analysis/correlations")
async def get_metric_correlations(
    path: str = Query(..., description="Project path"),
):
    """
    Compute correlation matrix between graph metrics. (P2)

    Returns:
        - metrics: List of metric names
        - matrix: Correlation matrix (NxN)
        - significantPairs: Pairs with p < 0.05
    """
    from . import (
        compute_pagerank,
        compute_betweenness_centrality,
        compute_clustering_coefficients,
    )
    from .dag import analyze_dag
    from .statistics import compute_metric_correlations

    G = _get_or_build_graph(path)

    # Collect metrics
    metrics = {}

    # PageRank
    pr_result = compute_pagerank(G)
    metrics["pagerank"] = pr_result.values

    # Betweenness
    bc_result = compute_betweenness_centrality(G)
    metrics["betweenness"] = bc_result.values

    # Clustering
    try:
        clustering_result = compute_clustering_coefficients(G)
        metrics["clustering"] = clustering_result.local
    except Exception as e:
        import logging
        logging.warning(f"Clustering failed in correlations: {e}")

    # In-degree
    metrics["indegree"] = {n: G.in_degree(n) for n in G.nodes()}

    # Out-degree
    metrics["outdegree"] = {n: G.out_degree(n) for n in G.nodes()}

    # DAG metrics
    dag_result = analyze_dag(G)
    if dag_result.get("is_dag", False):
        metrics["depth"] = dag_result.get("depths", {})
        metrics["bottleneck"] = dag_result.get("bottleneck_scores", {})
        metrics["reachability"] = dag_result.get("reachability", {})

    # Compute correlations
    corr_result = compute_metric_correlations(metrics, method="spearman")

    if "error" in corr_result:
        return {
            "status": "error",
            "analysis": "correlations",
            "error": corr_result["error"],
        }

    return {
        "status": "ok",
        "analysis": "correlations",
        "numNodes": G.number_of_nodes(),
        "data": {
            "metrics": corr_result.get("metric_names", []),
            "matrix": corr_result.get("correlation_matrix", []),
            "significantPairs": corr_result.get("significant_pairs", []),
        },
    }


@router.get("/api/project/analysis/embedding")
async def get_embedding_analysis(
    path: str = Query(..., description="Project path"),
    method: str = Query("spectral", description="Embedding method: spectral, diffusion"),
    n_components: int = Query(3, description="Number of dimensions"),
):
    """
    Compute graph embedding for visualization or clustering.

    Methods:
    - spectral: Based on Laplacian eigenvectors
    - diffusion: Based on diffusion process on graph

    Returns:
        - embedding: Dict mapping node -> [x, y, z] coordinates
    """
    from .embedding import compute_spectral_embedding, compute_diffusion_map

    G = _get_or_build_graph(path)

    if method == "spectral":
        result = compute_spectral_embedding(G, n_components=n_components)
    elif method == "diffusion":
        result = compute_diffusion_map(G, n_components=n_components)
    else:
        return {
            "status": "error",
            "analysis": "embedding",
            "error": f"Unknown method: {method}",
        }

    return {
        "status": "ok",
        "analysis": "embedding",
        "method": method,
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": result,
    }


@router.get("/api/project/analysis/patterns")
async def get_pattern_analysis(
    path: str = Query(..., description="Project path"),
    include_motifs: bool = Query(True, description="Count network motifs"),
    include_proof_patterns: bool = Query(True, description="Find proof-specific patterns"),
    sample_size: int = Query(1000, description="Sample size for motif significance"),
):
    """
    Pattern recognition in the dependency graph.

    Identifies structural patterns common in mathematical proofs:
    - Motifs: 3-node and 4-node subgraph patterns
    - Proof patterns: chains, forks, joins, diamonds

    Returns:
        - motifs: Counts and z-scores for each motif type
        - proofPatterns: List of found patterns with locations
    """
    from .pattern import count_motifs_3node, compute_motif_significance, find_proof_patterns

    G = _get_or_build_graph(path)
    response_data = {}

    if include_motifs:
        motif_counts = count_motifs_3node(G)
        if "error" not in motif_counts:
            significance = compute_motif_significance(G, n_random=sample_size)
            response_data["motifs"] = {
                "counts": motif_counts,
                "significance": significance.get("3_node", {}),
            }
        else:
            response_data["motifs"] = motif_counts

    if include_proof_patterns:
        proof_patterns = find_proof_patterns(G)
        response_data["proofPatterns"] = proof_patterns

    return {
        "status": "ok",
        "analysis": "patterns",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@router.get("/api/project/analysis/embedding-clusters")
async def get_embedding_clusters(
    path: str = Query(..., description="Project path"),
    n_clusters: int = Query(8, description="Number of clusters"),
):
    """
    Compute embedding-based node clusters. (P2)

    Uses spectral embedding + k-means to cluster nodes.

    Returns:
        - clusters: Dict mapping node_id to cluster_id
        - clusterSizes: Size of each cluster
    """
    from .embedding import compute_spectral_embedding
    from sklearn.cluster import KMeans
    import numpy as np

    G = _get_or_build_graph(path)

    # Get spectral embedding
    embedding_result = compute_spectral_embedding(G, n_components=min(10, G.number_of_nodes() - 1))

    if "error" in embedding_result:
        return {
            "status": "error",
            "analysis": "embedding-clusters",
            "error": embedding_result["error"],
        }

    # Extract embeddings
    embedding = embedding_result.get("embedding", {})
    if not embedding:
        return {
            "status": "error",
            "analysis": "embedding-clusters",
            "error": "No embedding computed",
        }

    nodes = list(embedding.keys())
    X = np.array([embedding[n] for n in nodes])

    # K-means clustering
    n_clusters = min(n_clusters, len(nodes))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    # Build result
    clusters = {nodes[i]: int(labels[i]) for i in range(len(nodes))}
    cluster_sizes = {}
    for label in labels:
        cluster_sizes[int(label)] = cluster_sizes.get(int(label), 0) + 1

    return {
        "status": "ok",
        "analysis": "embedding-clusters",
        "numNodes": G.number_of_nodes(),
        "data": {
            "clusters": clusters,
            "numClusters": n_clusters,
            "clusterSizes": cluster_sizes,
        },
    }


@router.get("/api/project/analysis/motif-participation")
async def get_motif_participation(
    path: str = Query(..., description="Project path"),
    max_instances: int = Query(500, description="Max pattern instances to find"),
):
    """
    Compute motif participation for each node. (P2)

    Identifies which patterns each node participates in.

    Returns:
        - nodeMotifs: Dict mapping node_id to {pattern_type: count}
        - dominantMotif: Dict mapping node_id to most common motif type
    """
    from .pattern import find_pattern_instances

    G = _get_or_build_graph(path)

    # Find instances of each pattern
    patterns = ["chain", "fork", "join", "diamond"]
    node_participation = {n: {} for n in G.nodes()}

    for pattern in patterns:
        instances = find_pattern_instances(G, pattern, max_instances=max_instances)
        for instance in instances:
            for node in instance.get("nodes", []):
                if node in node_participation:
                    node_participation[node][pattern] = node_participation[node].get(pattern, 0) + 1

    # Compute dominant motif for each node
    dominant_motif = {}
    for node, counts in node_participation.items():
        if counts:
            dominant_motif[node] = max(counts, key=counts.get)
        else:
            dominant_motif[node] = "none"

    return {
        "status": "ok",
        "analysis": "motif-participation",
        "numNodes": G.number_of_nodes(),
        "data": {
            "nodeMotifs": node_participation,
            "dominantMotif": dominant_motif,
        },
    }


# ============================================
# Lean-Specific Analysis Endpoints
# ============================================

@router.get("/api/project/analysis/metrics/all")
async def get_all_metrics(
    path: str = Query(..., description="Project path"),
):
    """
    Get aggregated metrics for all nodes in a single request.

    This endpoint combines multiple analysis results to minimize frontend requests.
    Returns per-node metrics and global statistics.

    Returns:
        - nodeMetrics: Dict mapping node_id to metric values
          - pagerank, betweenness, depth, bottleneck, reachability, clustering
        - globalStats: Graph-wide statistics
          - graphDepth, modularity, vonNeumannEntropy, density, etc.
        - kindDistribution: Declaration kind counts (Lean-specific)
    """
    from . import (
        compute_pagerank,
        compute_betweenness_centrality,
        compute_clustering_coefficients,
        compute_von_neumann_entropy,
        detect_communities_louvain,
    )
    from .dag import analyze_dag
    def declaration_kind_distribution(nodes):
        """Count declaration kinds (sort field) across all nodes."""
        from collections import Counter
        counts = Counter(n.get("sort", "unknown") for n in nodes)
        return {"counts": dict(counts), "total": sum(counts.values())}

    G = _get_or_build_graph(path)
    storage = _get_signature_store(path)
    nodes = storage.get_all_objs()
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()

    # Initialize node metrics dict
    node_metrics: dict[str, dict] = {n: {} for n in G.nodes()}

    # 1. PageRank (always include all values)
    pagerank_result = compute_pagerank(G, top_k=10)
    for node_id, value in pagerank_result.values.items():
        if node_id in node_metrics:
            node_metrics[node_id]["pagerank"] = value

    # 2. Betweenness (sample-based for large graphs)
    sample_k = min(1000, num_nodes) if num_nodes > 100 else None
    betweenness_result = compute_betweenness_centrality(G, k=sample_k, top_k=10)
    for node_id, value in betweenness_result.values.items():
        if node_id in node_metrics:
            node_metrics[node_id]["betweenness"] = value

    # 3. Clustering coefficients
    clustering_result = compute_clustering_coefficients(G)
    for node_id, value in clustering_result.local.items():
        if node_id in node_metrics:
            node_metrics[node_id]["clustering"] = value

    # 4. DAG analysis (depth, bottleneck, reachability)
    dag_result = analyze_dag(G)
    if dag_result.get("is_dag", False):
        depths = dag_result.get("depths", {})
        bottlenecks = dag_result.get("bottleneck_scores", {})
        reachability = dag_result.get("reachability", {})

        for node_id in node_metrics:
            node_metrics[node_id]["depth"] = depths.get(node_id, 0)
            node_metrics[node_id]["bottleneck"] = bottlenecks.get(node_id, 0)
            node_metrics[node_id]["reachability"] = reachability.get(node_id, 0)

    # 5. In-degree (for size mapping)
    for node_id in node_metrics:
        node_metrics[node_id]["indegree"] = G.in_degree(node_id)

    # 6. Katz centrality (P2)
    try:
        from .structural import compute_katz_centrality
        katz = compute_katz_centrality(G, alpha=0.05)  # Lower alpha for better convergence
        if katz:
            for node_id, value in katz.items():
                if node_id in node_metrics:
                    node_metrics[node_id]["katz"] = value
    except Exception as e:
        import logging
        logging.warning(f"Katz centrality failed: {e}")

    # 7. HITS (hub and authority scores) (P2)
    try:
        from .structural import compute_hits
        hubs, authorities = compute_hits(G)
        if hubs:
            for node_id, value in hubs.items():
                if node_id in node_metrics:
                    node_metrics[node_id]["hub"] = value
        if authorities:
            for node_id, value in authorities.items():
                if node_id in node_metrics:
                    node_metrics[node_id]["authority"] = value
    except Exception as e:
        import logging
        logging.warning(f"HITS failed: {e}")

    # Global statistics
    global_stats = {
        "numNodes": num_nodes,
        "numEdges": num_edges,
        "density": nx.density(G) if num_nodes > 1 else 0,
    }

    # DAG-specific global stats
    if dag_result.get("is_dag", False):
        global_stats["graphDepth"] = dag_result.get("graph_depth", 0)
        global_stats["numLayers"] = dag_result.get("num_layers", 0)
        global_stats["numSources"] = dag_result.get("num_sources", 0)
        global_stats["numSinks"] = dag_result.get("num_sinks", 0)

    # Community detection for modularity
    try:
        community_result = detect_communities_louvain(G.to_undirected())
        global_stats["modularity"] = community_result.modularity
        global_stats["numCommunities"] = community_result.num_communities
    except Exception:
        global_stats["modularity"] = 0
        global_stats["numCommunities"] = 0

    # Von Neumann entropy
    try:
        entropy_result = compute_von_neumann_entropy(G)
        global_stats["vonNeumannEntropy"] = entropy_result.get("entropy", 0)
    except Exception:
        global_stats["vonNeumannEntropy"] = 0

    # Lean-specific: Declaration kind distribution
    kind_distribution = {}
    try:
        kind_dist = declaration_kind_distribution(nodes)
        kind_distribution = kind_dist.get("counts", {})
        global_stats["totalDeclarations"] = kind_dist.get("total", num_nodes)
    except Exception:
        pass

    return {
        "status": "ok",
        "analysis": "metrics_all",
        "numNodes": num_nodes,
        "numEdges": num_edges,
        "data": {
            "nodeMetrics": node_metrics,
            "globalStats": global_stats,
            "kindDistribution": kind_distribution,
        },
    }

