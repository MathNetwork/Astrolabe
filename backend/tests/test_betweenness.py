"""
Test betweenness centrality with k > number of nodes.

Regression: k=1000 on a 175-node graph caused ValueError
because random.sample requires k <= population size.
"""
import networkx as nx
from astrolabe.functors.network_analysis.centrality import compute_betweenness_centrality


def test_betweenness_k_larger_than_nodes():
    """k larger than node count should not crash."""
    G = nx.path_graph(10, create_using=nx.DiGraph)
    result = compute_betweenness_centrality(G, k=1000, top_k=5)
    assert len(result.top_nodes) <= 10
    assert result.mean >= 0


def test_betweenness_small_graph():
    """Small graph with exact calculation."""
    G = nx.path_graph(5, create_using=nx.DiGraph)
    result = compute_betweenness_centrality(G, k=None, top_k=3)
    assert len(result.top_nodes) <= 5
    assert result.max_value >= 0


def test_betweenness_empty_graph():
    """Empty graph should return empty result."""
    G = nx.DiGraph()
    result = compute_betweenness_centrality(G, top_k=5)
    assert len(result.top_nodes) == 0


def test_betweenness_values_dict():
    """Result should have values dict with all nodes."""
    G = nx.path_graph(10, create_using=nx.DiGraph)
    result = compute_betweenness_centrality(G, k=None, top_k=5)
    assert len(result.values) == 10
