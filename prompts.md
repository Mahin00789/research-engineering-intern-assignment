# AI-Assisted Development Log — SimPPL Dashboard Assignment

This document outlines key components where AI assistance was used during development, including the prompts given and how the issues were resolved.

---

## Prompt 1

**Component:** `main.py` (FastAPI app + lifespan context manager)

**Prompt:** 
> "I need to set up FastAPI with a lifespan context manager that loads a large dataset at startup and defers expensive operations like semantic search index building until first request. The data loading takes ~1s but the search index takes ~2 minutes. How do I structure this so the app starts fast but doesn't crash when endpoints are called before the index is ready?"

**Issue & Fix:** 
The initial implementation tried to load everything in the lifespan `yield`, making the app wait 2+ minutes before starting. Additionally, the `/api/search` endpoint didn't check if the search engine was ready, causing 503 errors.

*Fix:* Implemented lazy initialization helpers (`ensure_search_engine_ready()` and `ensure_network_ready()`) that check if resources are built, and if not, build them on first request. This meant the app starts in <2s with just data loading, while expensive ML operations happen on demand. Also added proper error handling with informative HTTPException messages.

**Self-Implemented After:** CORS middleware configuration, all individual endpoint routes, pagination logic for `/api/posts`.

---

## Prompt 2

**Component:** `embeddings.py` (FAISS semantic search)

**Prompt:**
> "I'm trying to use FAISS for semantic search with embeddings from sentence-transformers. I got an embeddings matrix of shape (8799, 384) from all-MiniLM-L6-v2. I want cosine similarity search, not L2 distance. Should I use IndexFlatL2 or something else? Also how do I normalize embeddings properly?"

**Issue & Fix:**
Initially used `IndexFlatL2` which gives Euclidean distance, but for semantic similarity you want cosine distance. Also wasn't normalizing embeddings before adding to the index.

*Fix:* 
1. Changed to `IndexFlatIP` (Inner Product) which implements cosine similarity for normalized vectors
2. Added `normalize_embeddings=True` when encoding with sentence-transformers
3. Converted embeddings to float32 before adding to FAISS (required by index)
4. Verified that IP distance works correctly by testing: `np.dot(normalized_vec, normalized_vec) ≈ 1.0`

The search function then does: query encoding → normalization → IP search → return top_k results by relevance score.

**Self-Implemented After:** Caching embeddings to disk with pickle, batch encoding to avoid memory overflow, search result formatting.

---

## Prompt 3

**Component:** `llm.py` (Anthropic API integration + error handling)

**Prompt:**
> "I'm integrating Claude for dynamic chart summaries. The Anthropic API might fail due to rate limits or insufficient credits during development. How do I structure error handling so the app doesn't crash? Also, should I cache summaries or regenerate them each time?"

**Issue & Fix:**
The initial version called `client.messages.create()` without try-catch blocks in summarization functions. If the API failed, the entire endpoint would 500 error, breaking the dashboard.

*Fix:* 
1. Wrapped all LLM calls in try-except blocks
2. Instead of returning generic "unavailable" messages, implemented smart fallbacks:
   - `summarize_timeseries()` falls back to: "Activity from {date1} to {date2} with {avg} posts per day"
   - `summarize_cluster()` falls back to: "Cluster of {size} posts about: {keywords}"
   - `summarize_network()` falls back to: "Network with {nodes} nodes and {edges} edges. Most influential: {top_names}"
3. Changed error logging level from `logger.error()` to `logger.warning()` to indicate fallback was triggered
4. This way, the dashboard is always usable—just with data-driven summaries instead of AI ones during API downtime

**Self-Implemented After:** The actual prompt templates for summaries (tailoring them to r/Anarchism context), testing fallback outputs for readability.

---

## Prompt 4

**Component:** `NetworkGraph.jsx` (React force graph visualization)

**Prompt:**
> "I'm using react-force-graph-2d to render a network with 3000+ nodes and edges. The issue is: when I click a node, nothing happens—the highlighted state doesn't update. Also, the remove node button doesn't fetch new data after removal. And sometimes the graph doesn't render on page load. How do I debug this state issue?"

**Issue & Fix:**
Multiple problems:
1. The `handleNodeClick` function was being called but `setHighlighted()` wasn't working—turned out the component wasn't re-rendering
2. After removing a node, the state was being updated but the graph data wasn't—it was using stale graphData
3. The initial useEffect wasn't checking if data was already loaded, causing race conditions

*Fix:*
1. Separated node click handler: store both the clicked node object AND its ID in state, then used a separate `selectedNode` state to control highlighting
2. For remove-node: after API call, explicitly refetch graph data with a new request, clearing `highlighted` to prevent "remove node not found" errors
3. Updated useEffect dependencies: added explicit `[activeTab]` dependency so graph refetches when user switches to Network tab
4. Added loading state to prevent clicking nodes before graph renders:
   ```javascript
   if (loading) return <div>Loading network...</div>
   ```

**Self-Implemented After:** The actual node color/size logic, link styling, the reset button functionality, handling edge cases where graph data is empty.

---

## Prompt 5

**Component:** `Chatbot.jsx` (Multi-turn semantic search + conversation state)

**Prompt:**
> "I need a chatbot that does semantic search on each user query, then sends the query + last 3 conversation turns to Claude for context-aware answers. The tricky part: how do I manage conversation history state when the answer comes back? Should I store the full message history or just relevant context? Also, how do I extract suggested queries from the LLM response?"

**Issue & Fix:**
Initial version had bugs:
1. History was being mutated directly (`messages.push()`) instead of immutably, causing React to not detect updates
2. Suggested queries extraction was fragile—just splitting on "SUGGESTED:" but if Claude didn't include that marker, it returned empty
3. The chat history was growing unbounded, making API calls slower each turn (no trimming to last 6 messages)

*Fix:*
1. Changed to immutable state updates:
   ```javascript
   setMessages(prev => [...prev, newMessage])  // Always create new array
   ```
2. Robust suggested query extraction:
   ```javascript
   const history = messages.slice(-6).map(m => ({role: m.role, content: m.content}))
   // Trim to last 6 messages to keep context window manageable
   ```
3. Made suggested queries fallback graceful—if extraction fails, just show empty array instead of breaking:
   ```javascript
   suggested = "SUGGESTED:" in full_response 
      ? parts[1].split("|").filter(q => q.trim()) 
      : []
   ```
4. Added loading state while waiting for LLM response, preventing duplicate submissions

**Self-Implemented After:** The message bubble styling, example query buttons that auto-fill the input, scrolling to bottom on new messages, textarea auto-expand logic.

---

## Components Implemented Independently

The following components were built without AI assistance to demonstrate core competency:

- **`data_loader.py`** – Pandas JSONL loading, column selection, data type casting, missing value handling
- **`clustering.py`** – KMeans clustering with parameter tuning, PCA visualization, keyword extraction via TfidfVectorizer
- **`network.py`** – NetworkX graph construction, PageRank/betweenness centrality computation, node removal simulation
- **`TimeSeries.jsx`** ⭐ **ENHANCED** – Added Wikipedia events overlay with ReferenceLine, event tooltip, full event details list, and toggle button. Used Recharts ReferenceLine for visual annotations and smart date matching. Backend: Implemented `/api/events` endpoint with Wikipedia API integration, in-memory caching, and graceful fallback with placeholder events for common protest/labor movements.
- **`TopicClusters.jsx`** – Interactive scatter plot with n_clusters slider (2-20), cluster size visualization
- **`StatsCards.jsx`** – Dashboard stat cards with icons and metrics
- **`TopAuthors.jsx` & `TopDomains.jsx`** – Sorted tables with highlighting
- **`PostsTable.jsx`** – Paginated table with sorting by score/comments/date

---

## Key Learnings

1. **FAISS Index Selection:** IP (inner product) is for normalized embeddings + cosine similarity; L2 is for Euclidean distance. Always check your similarity metric.

2. **Graceful Degradation:** When integrating third-party APIs (Anthropic, FAISS), always implement smart fallbacks rather than 500 errors.

3. **React State Immutability:** Always create new objects/arrays when updating state. Direct mutations (`arr.push()`) don't trigger re-renders.

4. **Lazy Loading in FastAPI:** Use context managers + helper functions to defer expensive operations until first request, not startup.

5. **LLM Output Parsing:** Marker-based extraction (like "SUGGESTED:") is fragile. Always have fallbacks and don't let parsing failures break the app.

6. **External Data Integration:** When fetching from external APIs (Wikipedia), implement in-memory caching + fallback content. Use smart date parsing and always truncate long responses to avoid UI overflow.

---

**Total components: 11**  
**AI-assisted: 5 (complex integrations)**  
**Self-implemented: 6 (core functionality)**  
**Assignment Period:** March 2026
