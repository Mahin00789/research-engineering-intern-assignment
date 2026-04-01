import anthropic
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Anthropic client (reads ANTHROPIC_API_KEY from env)
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

MODEL = "claude-3-5-haiku-20241022"  # Fast + cheap for summaries


def summarize_timeseries(timeseries_data: list[dict], chart_type: str = "post_count") -> str:
    """
    Generate a plain-language summary of a time-series chart for non-technical users.
    This is called dynamically based on actual query results — not hardcoded.
    """
    if not timeseries_data:
        return "No data available for the selected time period."

    # Build a compact text representation of the data
    data_str = "\n".join(
        f"- {row.get('created_dt', row.get('date', 'N/A'))}: "
        f"{row.get('post_count', 0)} posts, "
        f"avg score {row.get('avg_score', 0)}, "
        f"{row.get('total_comments', 0)} comments"
        for row in timeseries_data[:30]  # Cap to avoid huge prompts
    )

    prompt = f"""You are helping a non-technical journalist understand a social media trend chart.

Here is the daily activity data from r/Anarchism (Jan–Feb 2025):
{data_str}

Write a 2–3 sentence plain-language summary of this trend. 
Mention: the overall pattern (growing/declining/stable), any notable spikes or drops, and what that might suggest about community activity.
Be concise, factual, and avoid jargon. Do not use bullet points."""

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.warning(f"LLM summary error (using fallback): {e}")
        first_date = timeseries_data[0].get('date', 'N/A')
        last_date = timeseries_data[-1].get('date', 'N/A')
        avg_posts = sum(d.get('post_count', 0) for d in timeseries_data) / len(timeseries_data)
        return f"Activity from {first_date} to {last_date} with an average of {avg_posts:.0f} posts per day."


def summarize_cluster(cluster: dict) -> str:
    """
    Generate a plain-language label/description for a topic cluster.
    """
    keywords = cluster.get("keywords", [])
    size = cluster.get("size", 0)
    avg_score = cluster.get("avg_score", 0)
    top_posts = cluster.get("top_posts", [])
    top_titles = [p.get("title", "") for p in top_posts[:3]]

    prompt = f"""You are analyzing a cluster of Reddit posts from r/Anarchism.

Cluster keywords: {', '.join(keywords)}
Number of posts: {size}
Average score: {avg_score}
Example post titles:
{chr(10).join(f'- {t}' for t in top_titles)}

In 1–2 sentences, describe what this cluster of posts is about.
Be specific and informative. Avoid generic descriptions."""

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.warning(f"LLM cluster summary error (using fallback): {e}")
        return f"Cluster of {size} posts focused on: {', '.join(keywords[:5])}"


def chatbot_response(
    user_query: str,
    search_results: list[dict],
    conversation_history: list[dict] = None,
) -> dict:
    """
    Generate a chatbot response based on semantic search results.
    Also suggests 2-3 follow-up queries the user might want to explore.
    """
    if not search_results:
        return {
            "answer": "I couldn't find any relevant posts for your query. Try rephrasing or using different keywords.",
            "suggested_queries": [
                "What are the most discussed anarchist topics?",
                "Which authors post the most?",
                "What external links are shared most often?",
            ],
        }

    # Build context from search results
    context = "\n\n".join(
        f"Post {i+1}: '{r['title']}' by u/{r['author']} "
        f"(score: {r['score']}, comments: {r['num_comments']}, date: {r['date']})\n"
        f"Text: {r['selftext'][:200]}"
        for i, r in enumerate(search_results[:5])
    )

    # Build conversation history for multi-turn
    messages = []
    if conversation_history:
        messages.extend(conversation_history[-6:])  # Keep last 3 turns

    messages.append({
        "role": "user",
        "content": f"""You are an AI research assistant analyzing Reddit posts from r/Anarchism (Jan–Feb 2025).
A user asked: "{user_query}"

Here are the most semantically relevant posts I found:
{context}

Answer the user's question based on these posts. Be concise (2–4 sentences).
Then suggest 2–3 related queries they might want to explore next, formatted as:
SUGGESTED: query1 | query2 | query3"""
    })

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=400,
            messages=messages,
        )
        full_response = response.content[0].text.strip()

        # Parse suggested queries if present
        suggested = []
        answer = full_response
        if "SUGGESTED:" in full_response:
            parts = full_response.split("SUGGESTED:")
            answer = parts[0].strip()
            suggested = [q.strip() for q in parts[1].split("|") if q.strip()]

        return {
            "answer": answer,
            "suggested_queries": suggested[:3],
            "sources": [
                {"title": r["title"], "url": r["url"], "score": r["relevance_score"]}
                for r in search_results[:3]
            ],
        }
    except Exception as e:
        logger.warning(f"Chatbot error (using fallback): {e}")
        first_result = search_results[0] if search_results else {}
        return {
            "answer": f"I found {len(search_results)} relevant posts. The most relevant is: '{first_result.get('title', 'N/A')}' with {first_result.get('num_comments', 0)} comments.",
            "suggested_queries": ["What topics are most discussed?", "Who are the most active authors?"],
            "sources": [
                {"title": r["title"], "url": r["url"], "score": r["relevance_score"]}
                for r in search_results[:3]
            ] if search_results else [],
        }


def summarize_network(network_stats: dict) -> str:
    """
    Generate a plain-language description of the network graph.
    """
    if not network_stats:
        return "Network data unavailable."

    top_nodes = network_stats.get("top_by_pagerank", [])
    top_names = [n["node"] for n in top_nodes[:3]]

    prompt = f"""Explain this social network of Reddit authors and shared domains in 2–3 sentences for a non-technical audience.

Stats:
- Total nodes (authors + domains): {network_stats.get('total_nodes', 0)}
- Total connections: {network_stats.get('total_edges', 0)}
- Connected components: {network_stats.get('connected_components', 0)}
- Most influential nodes by PageRank: {', '.join(top_names)}
- Network density: {network_stats.get('density', 0)}

Focus on: who/what is most influential, how connected the network is, and what this suggests about information flow."""

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=180,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.warning(f"Network summary error (using fallback): {e}")
        top_nodes = network_stats.get('top_by_pagerank', [])
        top_names = ', '.join([n['node'] for n in top_nodes[:3]])
        return f"Network graph with {network_stats.get('total_nodes', 0)} nodes and {network_stats.get('total_edges', 0)} connections. Most influential: {top_names}."