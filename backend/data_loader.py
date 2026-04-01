import json
import pandas as pd
from datetime import datetime
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_jsonl(filepath: str) -> pd.DataFrame:
    """
    Load the Reddit JSONL dataset, skip malformed lines,
    flatten the nested 'data' field into a clean DataFrame.
    """
    records = []
    skipped = 0

    with open(filepath, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                # Each record has 'kind' and 'data' keys
                if "data" in obj:
                    record = obj["data"]
                    record["kind"] = obj.get("kind", "unknown")
                    records.append(record)
            except json.JSONDecodeError:
                skipped += 1
                logger.warning(f"Skipping malformed JSON at line {i + 1}")

    logger.info(f"Loaded {len(records)} records, skipped {skipped} malformed lines")
    df = pd.DataFrame(records)
    df = clean_dataframe(df)
    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Select useful columns, clean types, handle nulls.
    """
    # Columns we actually use in the dashboard
    useful_cols = [
        "id", "kind", "title", "selftext", "author",
        "subreddit", "score", "upvote_ratio", "num_comments",
        "url", "domain", "permalink", "created_utc",
        "is_self", "over_18", "stickied", "locked",
        "num_crossposts", "total_awards_received",
        "link_flair_text", "is_video", "author_premium",
    ]

    # Only keep columns that actually exist in the dataset
    existing_cols = [c for c in useful_cols if c in df.columns]
    df = df[existing_cols].copy()

    # Convert timestamps to datetime
    if "created_utc" in df.columns:
        df["created_utc"] = pd.to_numeric(df["created_utc"], errors="coerce")
        df["created_dt"] = pd.to_datetime(df["created_utc"], unit="s", utc=True)
        df["date"] = df["created_dt"].dt.date
        df["hour"] = df["created_dt"].dt.hour
        df["day_of_week"] = df["created_dt"].dt.day_name()
        df["week"] = df["created_dt"].dt.isocalendar().week.astype(int)

    # Clean text fields
    for col in ["title", "selftext", "author"]:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str)
            df[col] = df[col].replace("[deleted]", "").replace("[removed]", "")

    # Combine title + selftext into one searchable text field
    df["full_text"] = (df.get("title", "") + " " + df.get("selftext", "")).str.strip()

    # Numeric cleanup
    for col in ["score", "num_comments", "num_crossposts", "total_awards_received"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    if "upvote_ratio" in df.columns:
        df["upvote_ratio"] = pd.to_numeric(df["upvote_ratio"], errors="coerce").fillna(0.0)

    # Drop rows with no title at all
    df = df[df["title"].str.len() > 0].reset_index(drop=True)

    logger.info(f"Cleaned DataFrame: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def get_summary_stats(df: pd.DataFrame) -> dict:
    """
    Return a dict of basic stats for the dashboard overview card.
    """
    return {
        "total_posts": len(df),
        "unique_authors": df["author"].nunique() if "author" in df.columns else 0,
        "date_range_start": str(df["date"].min()) if "date" in df.columns else None,
        "date_range_end": str(df["date"].max()) if "date" in df.columns else None,
        "avg_score": round(df["score"].mean(), 2) if "score" in df.columns else 0,
        "avg_comments": round(df["num_comments"].mean(), 2) if "num_comments" in df.columns else 0,
        "total_comments": int(df["num_comments"].sum()) if "num_comments" in df.columns else 0,
        "top_author": df["author"].value_counts().idxmax() if "author" in df.columns else None,
        "top_domain": df["domain"].value_counts().idxmax() if "domain" in df.columns else None,
        "unique_domains": df["domain"].nunique() if "domain" in df.columns else 0,
    }


def get_timeseries(df: pd.DataFrame, freq: str = "D") -> list[dict]:
    """
    Return daily (or weekly) post counts and avg score as a list of dicts.
    freq: 'D' for daily, 'W' for weekly
    """
    if "created_dt" not in df.columns:
        return []

    ts = (
        df.set_index("created_dt")
        .resample(freq)
        .agg(
            post_count=("id", "count"),
            avg_score=("score", "mean"),
            total_comments=("num_comments", "sum"),
        )
        .reset_index()
    )
    ts["created_dt"] = ts["created_dt"].dt.strftime("%Y-%m-%d")
    ts["avg_score"] = ts["avg_score"].round(2)
    ts = ts.fillna(0)
    return ts.to_dict(orient="records")


def get_top_authors(df: pd.DataFrame, n: int = 10) -> list[dict]:
    if "author" not in df.columns:
        return []
    author_stats = (
        df[df["author"] != ""]
        .groupby("author")
        .agg(
            post_count=("id", "count"),
            total_score=("score", "sum"),
            avg_score=("score", "mean"),
            total_comments=("num_comments", "sum"),
        )
        .sort_values("post_count", ascending=False)
        .head(n)
        .reset_index()
    )
    author_stats["avg_score"] = author_stats["avg_score"].round(2)
    return author_stats.to_dict(orient="records")


def get_top_domains(df: pd.DataFrame, n: int = 10) -> list[dict]:
    if "domain" not in df.columns:
        return []
    domain_counts = (
        df[df["domain"].notna() & (df["domain"] != "")]
        .groupby("domain")
        .agg(
            count=("id", "count"),
            avg_score=("score", "mean"),
        )
        .sort_values("count", ascending=False)
        .head(n)
        .reset_index()
    )
    domain_counts["avg_score"] = domain_counts["avg_score"].round(2)
    return domain_counts.to_dict(orient="records")