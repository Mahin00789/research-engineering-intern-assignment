import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import normalize
from collections import Counter
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Common English stopwords (no NLTK dependency)
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "this", "that", "are", "was",
    "be", "as", "i", "you", "he", "she", "we", "they", "have", "has",
    "had", "do", "does", "did", "will", "would", "could", "should", "not",
    "no", "so", "if", "my", "your", "his", "her", "our", "their", "its",
    "what", "how", "when", "where", "who", "which", "any", "all", "just",
    "about", "more", "like", "can", "been", "than", "there", "into",
    "also", "some", "up", "out", "want", "one", "get", "think", "know",
    "im", "ive", "dont", "doesnt", "isnt", "cant", "reddit", "amp",
    "really", "very", "much", "even", "other", "use", "used", "using",
    "https", "http", "www", "com"
}


def extract_keywords(texts: list[str], top_n: int = 5) -> list[str]:
    """
    Extract top keywords from a list of texts using simple word frequency.
    No external NLP library needed.
    """
    words = []
    for text in texts:
        # Lowercase, remove punctuation, split
        cleaned = re.sub(r"[^a-zA-Z\s]", " ", text.lower())
        tokens = cleaned.split()
        words.extend([w for w in tokens if w not in STOPWORDS and len(w) > 3])

    counts = Counter(words)
    return [word for word, _ in counts.most_common(top_n)]


def cluster_posts(
    df: pd.DataFrame,
    embeddings: np.ndarray,
    n_clusters: int = 5,
) -> dict:
    """
    Cluster posts using KMeans on sentence embeddings.
    Returns cluster assignments, labels, and 2D PCA projection for visualization.

    Parameters:
    - df: cleaned DataFrame with 'full_text', 'title', 'author', 'score' etc.
    - embeddings: numpy array of shape (n_posts, embedding_dim)
    - n_clusters: number of clusters (tunable by user)
    """
    n_clusters = max(2, min(n_clusters, len(df) - 1))  # Clamp to valid range
    logger.info(f"Clustering {len(df)} posts into {n_clusters} clusters...")

    # Normalize embeddings (already normalized if from SemanticSearchEngine)
    emb = normalize(embeddings.astype(np.float32))

    # KMeans clustering
    # Key params: n_init=10 for stability, random_state=42 for reproducibility
    kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42, max_iter=300)
    labels = kmeans.fit_predict(emb)

    # 2D PCA projection for visualization
    # Using 2 components for scatter plot; min(50, dim) intermediate for large dims
    n_components = min(2, emb.shape[0], emb.shape[1])
    pca = PCA(n_components=2, random_state=42)
    coords_2d = pca.fit_transform(emb)

    # Build cluster summaries
    clusters = []
    for cluster_id in range(n_clusters):
        mask = labels == cluster_id
        cluster_df = df[mask]
        cluster_texts = cluster_df["full_text"].tolist()

        keywords = extract_keywords(cluster_texts, top_n=6)
        top_posts = (
            cluster_df.sort_values("score", ascending=False)
            .head(3)[["title", "author", "score", "num_comments", "url"]]
            .to_dict(orient="records")
        )

        clusters.append({
            "cluster_id": cluster_id,
            "size": int(mask.sum()),
            "keywords": keywords,
            "label": f"Topic {cluster_id + 1}: {', '.join(keywords[:3])}",
            "top_posts": top_posts,
            "avg_score": round(float(cluster_df["score"].mean()), 2),
            "avg_comments": round(float(cluster_df["num_comments"].mean()), 2),
        })

    # Sort clusters by size descending
    clusters.sort(key=lambda x: x["size"], reverse=True)

    # Build point-level data for scatter plot
    points = []
    for i, (label, (x, y)) in enumerate(zip(labels, coords_2d)):
        row = df.iloc[i]
        points.append({
            "x": round(float(x), 4),
            "y": round(float(y), 4),
            "cluster_id": int(label),
            "title": str(row.get("title", ""))[:80],
            "author": str(row.get("author", "")),
            "score": int(row.get("score", 0)),
            "date": str(row.get("date", "")),
        })

    # Inertia as a quality metric (lower = tighter clusters)
    inertia = round(float(kmeans.inertia_), 4)

    logger.info(f"Clustering done. Inertia={inertia}")
    return {
        "n_clusters": n_clusters,
        "clusters": clusters,
        "points": points,
        "inertia": inertia,
        "variance_explained": round(float(sum(pca.explained_variance_ratio_)) * 100, 2),
    }