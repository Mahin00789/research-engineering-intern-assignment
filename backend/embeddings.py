import numpy as np
import faiss
import pandas as pd
from sentence_transformers import SentenceTransformer
import logging
import os
import pickle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Using a lightweight but strong model for semantic similarity
MODEL_NAME = "all-MiniLM-L6-v2"  # 384-dim, fast, good quality
CACHE_DIR = "./cache"


class SemanticSearchEngine:
    def __init__(self):
        self.model = None
        self.index = None
        self.df = None
        self.embeddings = None

    def load_model(self):
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        self.model = SentenceTransformer(MODEL_NAME)
        logger.info("Model loaded.")

    def build_index(self, df: pd.DataFrame, force_rebuild: bool = False):
        """
        Build a FAISS index from the post texts.
        Caches embeddings to disk so we don't recompute on every restart.
        """
        self.df = df.reset_index(drop=True)
        os.makedirs(CACHE_DIR, exist_ok=True)
        cache_path = os.path.join(CACHE_DIR, "embeddings.pkl")

        if not force_rebuild and os.path.exists(cache_path):
            logger.info("Loading cached embeddings...")
            with open(cache_path, "rb") as f:
                self.embeddings = pickle.load(f)
            logger.info(f"Loaded cached embeddings: shape={self.embeddings.shape}")
        else:
            logger.info("Computing embeddings for all posts...")
            texts = df["full_text"].tolist()
            # Batch encode for efficiency
            self.embeddings = self.model.encode(
                texts,
                batch_size=64,
                show_progress_bar=True,
                normalize_embeddings=True,  # cosine similarity via dot product
            )
            with open(cache_path, "wb") as f:
                pickle.dump(self.embeddings, f)
            logger.info(f"Embeddings computed and cached: shape={self.embeddings.shape}")

        # Build FAISS flat index (exact search — fine for 181 records)
        dim = self.embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)  # Inner product = cosine sim (normalized)
        self.index.add(self.embeddings.astype(np.float32))
        logger.info(f"FAISS index built with {self.index.ntotal} vectors, dim={dim}")

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Semantic search: returns top_k most relevant posts for a query.
        Works even with zero keyword overlap.
        """
        if self.model is None or self.index is None:
            raise RuntimeError("Engine not initialized. Call load_model() and build_index() first.")

        if not query or len(query.strip()) < 2:
            return []

        # Encode the query with the same model
        query_vec = self.model.encode(
            [query.strip()],
            normalize_embeddings=True,
        ).astype(np.float32)

        # Search FAISS index
        scores, indices = self.index.search(query_vec, min(top_k, self.index.ntotal))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:  # FAISS returns -1 for empty slots
                continue
            row = self.df.iloc[idx]
            results.append({
                "id": str(row.get("id", "")),
                "title": str(row.get("title", "")),
                "author": str(row.get("author", "")),
                "score": int(row.get("score", 0)),
                "num_comments": int(row.get("num_comments", 0)),
                "url": str(row.get("url", "")),
                "domain": str(row.get("domain", "")),
                "date": str(row.get("date", "")),
                "selftext": str(row.get("selftext", ""))[:300],
                "relevance_score": round(float(score), 4),
            })

        return results

    def get_embeddings_for_visualization(self) -> dict:
        """
        Return embeddings + metadata for 2D visualization (used by Nomic/UMAP).
        """
        if self.embeddings is None or self.df is None:
            return {}

        return {
            "embeddings": self.embeddings.tolist(),
            "metadata": [
                {
                    "id": str(row.get("id", "")),
                    "title": str(row.get("title", ""))[:80],
                    "author": str(row.get("author", "")),
                    "score": int(row.get("score", 0)),
                    "date": str(row.get("date", "")),
                }
                for _, row in self.df.iterrows()
            ],
        }