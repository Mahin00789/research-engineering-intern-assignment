import networkx as nx
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def build_author_domain_graph(df: pd.DataFrame) -> nx.Graph:
    """
    Build a bipartite-style graph where:
    - Nodes: authors + domains
    - Edges: author -> domain if author posted a link to that domain

    Excludes self-posts (domain = 'self.*') and bots like AutoModerator.
    """
    G = nx.Graph()

    excluded_authors = {"AutoModerator", "", "[deleted]"}
    excluded_domain_prefixes = ("self.",)

    for _, row in df.iterrows():
        author = str(row.get("author", "")).strip()
        domain = str(row.get("domain", "")).strip()
        score = int(row.get("score", 0))

        if author in excluded_authors:
            continue
        if not domain or any(domain.startswith(p) for p in excluded_domain_prefixes):
            continue

        # Add nodes with type metadata
        if not G.has_node(author):
            G.add_node(author, node_type="author", post_count=0, total_score=0)
        if not G.has_node(domain):
            G.add_node(domain, node_type="domain", post_count=0, total_score=0)

        # Update node stats
        G.nodes[author]["post_count"] = G.nodes[author].get("post_count", 0) + 1
        G.nodes[author]["total_score"] = G.nodes[author].get("total_score", 0) + score
        G.nodes[domain]["post_count"] = G.nodes[domain].get("post_count", 0) + 1
        G.nodes[domain]["total_score"] = G.nodes[domain].get("total_score", 0) + score

        # Add or update edge
        if G.has_edge(author, domain):
            G[author][domain]["weight"] += 1
            G[author][domain]["total_score"] += score
        else:
            G.add_edge(author, domain, weight=1, total_score=score)

    logger.info(
        f"Graph built: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges"
    )
    return G


def compute_centrality(G: nx.Graph) -> dict:
    """
    Compute PageRank and betweenness centrality for all nodes.
    PageRank: measures overall influence/importance
    Betweenness: measures how often a node bridges others (key connector)
    """
    if G.number_of_nodes() == 0:
        return {}

    # PageRank — alpha=0.85 is the standard damping factor
    pagerank = nx.pagerank(G, alpha=0.85, weight="weight", max_iter=200)

    # Betweenness centrality — normalized, works on disconnected graphs
    betweenness = nx.betweenness_centrality(G, normalized=True, weight="weight")

    # Degree centrality
    degree = nx.degree_centrality(G)

    return {
        node: {
            "pagerank": round(pagerank.get(node, 0), 6),
            "betweenness": round(betweenness.get(node, 0), 6),
            "degree_centrality": round(degree.get(node, 0), 6),
        }
        for node in G.nodes()
    }


def graph_to_json(G: nx.Graph, centrality: dict, max_nodes: int = 80) -> dict:
    """
    Convert NetworkX graph to a JSON-serializable format for the frontend.
    Filters to top nodes by PageRank if graph is large.
    """
    if G.number_of_nodes() == 0:
        return {"nodes": [], "links": [], "stats": {}}

    # Rank nodes by PageRank and keep top max_nodes
    ranked_nodes = sorted(
        centrality.items(),
        key=lambda x: x[1]["pagerank"],
        reverse=True,
    )[:max_nodes]
    top_node_ids = {n for n, _ in ranked_nodes}

    nodes = []
    for node_id in top_node_ids:
        node_data = G.nodes[node_id]
        c = centrality.get(node_id, {})
        nodes.append({
            "id": node_id,
            "node_type": node_data.get("node_type", "unknown"),
            "post_count": node_data.get("post_count", 0),
            "total_score": node_data.get("total_score", 0),
            "pagerank": c.get("pagerank", 0),
            "betweenness": c.get("betweenness", 0),
            "degree_centrality": c.get("degree_centrality", 0),
            # Node size hint for frontend (scale by pagerank)
            "size": max(4, min(30, int(c.get("pagerank", 0) * 5000))),
        })

    # Only include edges where both endpoints are in our top set
    links = []
    for u, v, data in G.edges(data=True):
        if u in top_node_ids and v in top_node_ids:
            links.append({
                "source": u,
                "target": v,
                "weight": data.get("weight", 1),
                "total_score": data.get("total_score", 0),
            })

    # Graph-level stats
    components = list(nx.connected_components(G))
    stats = {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "connected_components": len(components),
        "largest_component_size": max(len(c) for c in components) if components else 0,
        "avg_degree": round(sum(d for _, d in G.degree()) / G.number_of_nodes(), 2),
        "density": round(nx.density(G), 4),
        "top_by_pagerank": [
            {"node": n, **c}
            for n, c in ranked_nodes[:5]
        ],
    }

    return {"nodes": nodes, "links": links, "stats": stats}


def remove_node_and_analyze(G: nx.Graph, node_id: str, centrality: dict) -> dict:
    """
    Remove a node and return the new graph JSON.
    Used for the 'what happens when you remove a highly connected node?' edge case.
    """
    if node_id not in G:
        return {"error": f"Node '{node_id}' not found in graph"}

    G2 = G.copy()
    G2.remove_node(node_id)

    if G2.number_of_nodes() == 0:
        return {"nodes": [], "links": [], "stats": {"message": "Graph is empty after removal"}}

    centrality2 = compute_centrality(G2)
    return graph_to_json(G2, centrality2)


def get_author_network(df: pd.DataFrame) -> dict:
    """
    Full pipeline: build graph → compute centrality → serialize to JSON.
    """
    G = build_author_domain_graph(df)

    if G.number_of_nodes() == 0:
        return {"nodes": [], "links": [], "stats": {}}

    centrality = compute_centrality(G)
    return {
        **graph_to_json(G, centrality),
        "_graph": G,          # Keep reference for node-removal endpoint
        "_centrality": centrality,
    }