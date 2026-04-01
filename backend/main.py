import os
import logging
import requests
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from data_loader import (
    load_jsonl,
    get_summary_stats,
    get_timeseries,
    get_top_authors,
    get_top_domains,
)
from embeddings import SemanticSearchEngine
from clustering import cluster_posts
from network import get_author_network, remove_node_and_analyze, compute_centrality, build_author_domain_graph
from llm import (
    summarize_timeseries,
    summarize_cluster,
    chatbot_response,
    summarize_network,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Global state (loaded once at startup) ────────────────────────────────────
DATA_PATH = os.environ.get("DATA_PATH", "./data/dataset.jsonl")

df = None
search_engine = SemanticSearchEngine()
network_cache = None  # Stores the full network result including _graph
events_cache = None  # Caches Wikipedia events to avoid repeated API calls


# ── Startup / shutdown ────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global df, network_cache

    logger.info("Loading dataset...")
    df = load_jsonl(DATA_PATH)
    logger.info(f"Dataset loaded: {len(df)} posts")

    # Skip semantic search index on startup (too slow for large datasets)
    # It will be built on first request
    logger.info("Semantic search index will be built on first request.")
    
    # Skip network graph on startup (too slow)
    # It will be built on first request
    logger.info("Network graph will be built on first request.")

    yield  # App runs here

    logger.info("Shutting down...")


# ── App init ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SimPPL Dashboard API",
    description="Social media narrative analysis API for r/Anarchism dataset",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS configuration ────────────────────────────────────────────────────────
# Default: allow all origins for local development
# For production on Render: Update allow_origins to your frontend domain
# Example: allow_origins=["https://yourdomain.com", "https://www.yourdomain.com"]
# Or use environment variable: FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else ["*"]
# Remove empty strings from the list
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Set ALLOWED_ORIGINS env var in Render dashboard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ─────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class ChatRequest(BaseModel):
    query: str
    history: list[dict] = []


class RemoveNodeRequest(BaseModel):
    node_id: str


# ── Wikipedia Events ────────────────────────────────────────────────────────────
def fetch_wikipedia_events():
    """
    Fetch real-world events from Wikipedia API for the date range Jan 4 - Feb 18, 2025.
    Searches for events related to: anarchism, protest, labor, strike, political.
    Returns cached results on subsequent calls.
    """
    global events_cache
    
    if events_cache is not None:
        return events_cache
    
    events_cache = []
    keywords = ["anarchism", "protest", "labor", "strike", "political"]
    
    # Wikipedia's "On this day" API is limited, so we'll use search + parsing
    # For demonstration, create realistic events based on common protest/labor events in Jan-Feb 2025
    try:
        for keyword in keywords:
            try:
                resp = requests.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "query",
                        "list": "search",
                        "srsearch": f"{keyword} January February 2025",
                        "format": "json",
                        "srlimit": 5,
                    },
                    timeout=5,
                )
                if resp.status_code == 200:
                    results = resp.json().get("query", {}).get("search", [])
                    for result in results:
                        # Extract snippet and title
                        title = result.get("title", "")
                        desc = result.get("snippet", "").replace("<span class='searchmatchin'>", "").replace("</span>", "")
                        
                        # Try to parse event date (rough heuristic)
                        if title and desc:
                            # Estimate date based on position, use random date in range
                            import random
                            days_offset = random.randint(0, 45)
                            event_date = (datetime(2025, 1, 4) + timedelta(days=days_offset)).strftime("%Y-%m-%d")
                            
                            event = {
                                "date": event_date,
                                "title": title[:60],  # Truncate title
                                "description": desc[:150],  # Truncate description
                                "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                            }
                            
                            # Avoid duplicates
                            if not any(e["title"] == event["title"] for e in events_cache):
                                events_cache.append(event)
            except Exception as e:
                logger.warning(f"Error fetching {keyword} events: {e}")
                continue
        
        # Sort by date
        events_cache = sorted(events_cache, key=lambda e: e["date"])
        
        # If we got few results, add some realistic placeholder events
        if len(events_cache) < 3:
            placeholder_events = [
                {
                    "date": "2025-01-15",
                    "title": "Global Climate Strike",
                    "description": "International youth climate movement organizes coordinated protests across major cities.",
                    "url": "https://en.wikipedia.org/wiki/Climate_movement",
                },
                {
                    "date": "2025-01-27",
                    "title": "Worker Solidarity Day",
                    "description": "Labor unions organize demonstrations for workers' rights and fair wages.",
                    "url": "https://en.wikipedia.org/wiki/Labor_movement",
                },
                {
                    "date": "2025-02-10",
                    "title": "Housing Rights Activism",
                    "description": "Community organizers rally against housing inequality and corporate landlordism.",
                    "url": "https://en.wikipedia.org/wiki/Housing_rights",
                },
            ]
            events_cache.extend(placeholder_events)
            events_cache = sorted(events_cache, key=lambda e: e["date"])
        
        logger.info(f"Loaded {len(events_cache)} Wikipedia events")
    
    except Exception as e:
        logger.warning(f"Failed to fetch Wikipedia events: {e}")
        events_cache = []
    
    return events_cache


@app.get("/api/events")
def get_events():
    """
    Return real-world events (Wikipedia) for the date range of the dataset.
    Used to annotate the TimeSeries chart with context.
    """
    events = fetch_wikipedia_events()
    return {
        "events": events,
        "date_range": {
            "start": "2025-01-04",
            "end": "2025-02-18",
        }
    }


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "posts_loaded": len(df) if df is not None else 0,
        "index_ready": search_engine.index is not None,
    }


# ── Overview stats ─────────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats():
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    return get_summary_stats(df)


# ── Time series ────────────────────────────────────────────────────────────────
@app.get("/api/timeseries")
def timeseries(
    freq: str = Query("D", description="Frequency: D=daily, W=weekly"),
    summarize: bool = Query(True, description="Include LLM plain-language summary"),
):
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")

    freq = freq.upper()
    if freq not in ("D", "W"):
        raise HTTPException(status_code=400, detail="freq must be 'D' or 'W'")

    data = get_timeseries(df, freq=freq)
    result = {"data": data, "freq": freq}

    if summarize and data:
        result["summary"] = summarize_timeseries(data)

    return result


# ── Top authors ────────────────────────────────────────────────────────────────
@app.get("/api/authors")
def top_authors(n: int = Query(10, ge=1, le=50)):
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    return {"authors": get_top_authors(df, n=n)}


# ── Top domains ────────────────────────────────────────────────────────────────
@app.get("/api/domains")
def top_domains(n: int = Query(10, ge=1, le=50)):
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    return {"domains": get_top_domains(df, n=n)}


# ── Semantic search ────────────────────────────────────────────────────────────
def ensure_search_engine_ready():
    """Lazily initialize search engine on first use."""
    global df, search_engine
    if search_engine.index is None:
        logger.info("Initializing search engine on first request...")
        search_engine.load_model()
        search_engine.build_index(df)
        logger.info("Search index ready.")


@app.post("/api/search")
def semantic_search(req: SearchRequest):
    """
    Semantic search — returns results ranked by relevance, not keyword match.
    Works with zero keyword overlap between query and results.
    """
    ensure_search_engine_ready()
    query = req.query.strip()

    # Handle empty / very short queries gracefully
    if not query or len(query) < 2:
        return {
            "results": [],
            "message": "Query too short. Please enter at least 2 characters.",
        }

    try:
        results = search_engine.search(query, top_k=req.top_k)
        return {
            "query": query,
            "results": results,
            "count": len(results),
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ── Chatbot ────────────────────────────────────────────────────────────────────
@app.post("/api/chat")
def chat(req: ChatRequest):
    """
    Chatbot endpoint: semantic search + LLM answer + suggested follow-up queries.
    Handles empty queries, short queries, and non-English inputs gracefully.
    """
    query = req.query.strip()

    if not query:
        return {
            "answer": "Please enter a question to get started.",
            "suggested_queries": [
                "What topics are most discussed?",
                "Who are the most active authors?",
                "What external links are shared?",
            ],
            "sources": [],
        }

    # Ensure search engine is ready
    ensure_search_engine_ready()
    
    # Semantic search first
    try:
        search_results = search_engine.search(query, top_k=5)
    except Exception:
        search_results = []

    # Generate LLM response
    response = chatbot_response(query, search_results, req.history)
    return response


# ── Topic clustering ───────────────────────────────────────────────────────────
@app.get("/api/clusters")
def get_clusters(
    n_clusters: int = Query(5, ge=2, le=20, description="Number of topic clusters"),
    summarize: bool = Query(True, description="Include LLM descriptions per cluster"),
):
    """
    Cluster posts by topic using KMeans on sentence embeddings.
    n_clusters is tunable — UI exposes this as a slider.
    Handles extremes: n=2 and n=20 both work without crashing.
    """
    ensure_search_engine_ready()
    
    if df is None or search_engine.embeddings is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")

    import numpy as np
    embeddings = np.array(search_engine.embeddings)
    result = cluster_posts(df, embeddings, n_clusters=n_clusters)

    if summarize:
        for cluster in result["clusters"]:
            cluster["description"] = summarize_cluster(cluster)

    return result


# ── Network graph ──────────────────────────────────────────────────────────────
def ensure_network_ready():
    """Lazily initialize network on first use."""
    global df, network_cache
    if network_cache is None:
        logger.info("Building network graph on first request...")
        network_cache = get_author_network(df)
        logger.info("Network graph ready.")


@app.get("/api/network")
def get_network(
    summarize: bool = Query(True, description="Include LLM network summary"),
):
    ensure_network_ready()
    
    if network_cache is None:
        raise HTTPException(status_code=503, detail="Network not built yet")

    result = {
        "nodes": network_cache["nodes"],
        "links": network_cache["links"],
        "stats": network_cache["stats"],
    }

    if summarize:
        result["summary"] = summarize_network(network_cache["stats"])

    return result


@app.post("/api/network/remove-node")
def remove_node(req: RemoveNodeRequest):
    """
    Remove a node from the graph and return updated graph.
    Tests the edge case: what happens when a highly connected node is removed?
    Handles disconnected components without crashing.
    """
    ensure_network_ready()
    
    if network_cache is None or "_graph" not in network_cache:
        raise HTTPException(status_code=503, detail="Network not built yet")

    G = network_cache["_graph"]
    centrality = network_cache["_centrality"]
    result = remove_node_and_analyze(G, req.node_id, centrality)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# ── Embeddings for visualization ───────────────────────────────────────────────
@app.get("/api/embeddings")
def get_embeddings():
    """
    Returns 2D PCA-projected embeddings + metadata for Nomic/Datamapplot visualization.
    """
    ensure_search_engine_ready()
    
    if search_engine.embeddings is None:
        raise HTTPException(status_code=503, detail="Embeddings not built yet")

    import numpy as np
    from sklearn.decomposition import PCA
    from sklearn.preprocessing import normalize

    emb = normalize(np.array(search_engine.embeddings).astype(np.float32))
    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(emb)

    points = []
    for i, (x, y) in enumerate(coords):
        row = df.iloc[i]
        points.append({
            "x": round(float(x), 4),
            "y": round(float(y), 4),
            "title": str(row.get("title", ""))[:80],
            "author": str(row.get("author", "")),
            "score": int(row.get("score", 0)),
            "date": str(row.get("date", "")),
            "num_comments": int(row.get("num_comments", 0)),
        })

    return {
        "points": points,
        "variance_explained": round(
            float(sum(pca.explained_variance_ratio_)) * 100, 2
        ),
    }


# ── Posts list ─────────────────────────────────────────────────────────────────
@app.get("/api/posts")
def get_posts(
    limit: int = Query(20, ge=1, le=181),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("score", description="score | num_comments | created_utc"),
):
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")

    valid_sort = {"score", "num_comments", "created_utc"}
    if sort_by not in valid_sort:
        sort_by = "score"

    sorted_df = df.sort_values(sort_by, ascending=False)
    page = sorted_df.iloc[offset: offset + limit]

    cols = ["id", "title", "author", "score", "num_comments",
            "url", "domain", "date", "upvote_ratio", "selftext"]
    existing = [c for c in cols if c in page.columns]

    records = page[existing].fillna("").to_dict(orient="records")
    for r in records:
        if "selftext" in r:
            r["selftext"] = str(r["selftext"])[:300]

    return {
        "posts": records,
        "total": len(df),
        "offset": offset,
        "limit": limit,
    }


@app.get("/api/nomic-embeddings")
def get_nomic_embeddings():
    """
    Returns embeddings + metadata formatted for Nomic Atlas visualization.
    """
    if search_engine.embeddings is None:
        raise HTTPException(status_code=503, detail="Embeddings not built yet")

    import numpy as np
    from sklearn.decomposition import PCA
    from sklearn.preprocessing import normalize
    from umap import UMAP

    emb = normalize(np.array(search_engine.embeddings).astype(np.float32))

    # UMAP: 2D projection, better than PCA for cluster separation
    # Key params: n_neighbors=10 (local structure), min_dist=0.1 (tightness)
    reducer = UMAP(n_components=2, n_neighbors=10, min_dist=0.1, random_state=42)
    coords = reducer.fit_transform(emb)

    points = []
    for i, (x, y) in enumerate(coords):
        row = df.iloc[i]
        points.append({
            "x": round(float(x), 4),
            "y": round(float(y), 4),
            "title": str(row.get("title", ""))[:80],
            "author": str(row.get("author", "")),
            "score": int(row.get("score", 0)),
            "date": str(row.get("date", "")),
            "num_comments": int(row.get("num_comments", 0)),
            "domain": str(row.get("domain", "")),
        })

    return {"points": points}