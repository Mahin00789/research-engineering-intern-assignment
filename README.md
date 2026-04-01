# Anarchism Narrative Analysis Dashboard

**A semantic search + network analysis dashboard for exploring narrative dynamics in online communities**

---

## 1. Project Overview

This project is a **research engineering case study** analyzing 8,799 Reddit posts from Anarchism (January–February 2025). The goal is to understand information flow, community engagement patterns, and the emergence of dominant narratives using modern NLP and network analysis techniques.

### Case Study: Information Dynamics in Online Activism Communities

**Context:**  
r/Anarchism is a high-engagement online community discussing political theory, direct action, mutual aid, and social movements. Understanding how information circulates and which voices/topics dominate is crucial for studying contemporary activism narratives.

**Research Questions:**
- How do semantic topics emerge and evolve over time?
- Which authors and external domains are most central to information flow?
- Can we predict which topics will sustain engagement?
- How do removal of key nodes (influential authors/sources) affect network resilience?

**Approach:**  
Rather than keyword-matching alone, we use **semantic embeddings + clustering + graph analysis** to capture meaning-level patterns that keyword filtering would miss. This reveals that discussions about "mutual aid networks" and "collective action" are semantically related even with zero keyword overlap.

---

## 2. Features

- ✅ **Semantic Search** – Find posts by meaning, not keywords. Zero keyword overlap works.
- ✅ **Topic Clustering** – Auto-discover themes using KMeans on embeddings
- ✅ **Network Analysis** – Visualize author–domain relationships with PageRank centrality
- ✅ **Time Series Analytics** – Track posting activity and engagement over time
- ✅ **Author & Domain Rankings** – Identify most influential voices and sources
- ✅ **AI Summaries** – Plain-language explanations of trends (powered by Claude)
- ✅ **Interactive Network Graph** – Click nodes, remove key actors, test network resilience
- ✅ **Embedding Visualization** – 2D UMAP projection of all posts for cluster exploration
- ✅ **Chatbot Interface** – Multi-turn Q&A with semantic search grounding
- ✅ **Posts Browser** – Sortable table with full post text and metadata

---

## 3. Setup Instructions

### Backend Setup

**Prerequisites:**
- Python 3.10+
- pip

**Installation:**

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with:
ANTHROPIC_API_KEY=your_api_key_here
DATA_PATH=path/to/data.jsonl
```

**Running the Server:**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

**Prerequisites:**
- Node.js 18+
- npm

**Installation:**

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

---

## 4. ML/AI Components

| Component | Model / Algorithm | Key Parameters | Library | Purpose |
|-----------|-------------------|-----------------|---------|---------|
| **Semantic Search** | all-MiniLM-L6-v2 | dim=384, cosine similarity | sentence-transformers, FAISS | Find posts by semantic meaning |
| **Clustering** | KMeans | n_clusters=5, n_init=10, random_state=42 | scikit-learn | Discover topic themes |
| **Cluster Viz** | PCA | n_components=2, random_state=42 | scikit-learn | 2D visualization of clusters |
| **Network Analysis** | PageRank | alpha=0.85, max_iter=100 | NetworkX | Measure node influence |
| **Centrality** | Betweenness | normalized=True | NetworkX | Identify bridge nodes |
| **Embedding Viz** | UMAP | n_neighbors=10, min_dist=0.1 | umap-learn | 2D scatter of all posts |
| **LLM Summaries** | Claude 3.5 Haiku | max_tokens=180 | Anthropic API | Plain-language explanations |
| **Index** | FAISS IndexFlatIP | — | faiss-cpu | Fast nearest-neighbor search |

---

## 5. Semantic Search Examples (Zero Keyword Overlap)

### Example 1: Implicit Reading Material Discovery
**Query:** `"suggested reading material"`  
**Expected Result:** Posts about book recommendations  
**Actual Match:** Post titled "Book Club Tuesday" discussing theory readings  
**Why it works:** The query "suggested reading material" is semantically equivalent to "books to read" even though the title contains no mention of suggestions or materials. The embedding captures intent.

### Example 2: Community Organizing Without Keywords
**Query:** `"community organizing strategies"`  
**Expected Result:** Posts about mutual aid, collective action, coordination  
**Actual Match:** Posts titled "Mutual Aid Networks and Resource Sharing" with zero keyword overlap  
**Why it works:** "Community organizing" and "mutual aid" share deep semantic meaning (coordinated collective action), but no shared words. Embeddings capture this.

### Example 3: Philosophical Debate Discovery
**Query:** `"philosophical disagreements"`  
**Expected Result:** Posts debating anarchist philosophy  
**Actual Match:** Post titled "Anarcho-Nihilism vs Traditional Anarchism" with no mention of "philosophical" or "disagreements"  
**Why it works:** Debates are inherently disagreements, and ideology discussions are philosophical. The semantic model understands this connection despite zero lexical overlap.

---

## 6. API Endpoints

### Health & Status
- `GET /health` – Server status and data summary

### Overview Stats
- `GET /api/stats` – Total posts, users, date range, engagement metrics
- `GET /api/timeseries?freq=D` – Daily/weekly post counts with LLM summary
- `GET /api/authors?n=10` – Top N most active authors
- `GET /api/domains?n=10` – Top N most shared external domains

### Semantic Search
- `POST /api/search` – Find posts by semantic meaning
  ```json
  {"query": "suggested reading", "top_k": 5}
  ```
- `POST /api/chat` – Multi-turn chatbot with semantic grounding
  ```json
  {"query": "What topics are discussed?", "history": []}
  ```

### Topic Analysis
- `GET /api/clusters?n_clusters=5` – Discover topic themes
  - Returns: cluster IDs, keyterms, member posts, AI descriptions

### Network Analysis
- `GET /api/network?summarize=true` – Author–domain network with PageRank
  - Returns: nodes, edges, centrality metrics, AI summary
- `POST /api/network/remove-node` – Test resilience by removing key nodes
  ```json
  {"node_id": "some_author_name"}
  ```

### Embeddings & Visualization
- `GET /api/embeddings` – 2D PCA projection of all posts
- `GET /api/nomic-embeddings` – 2D UMAP projection (better cluster separation)

### Posts
- `GET /api/posts?limit=20&offset=0&sort_by=score` – Paginated posts list

---

## 7. Deployment

### Backend Deployment URL
```
BACKEND_URL = https://your-backend-domain.com
```
*(Replace with your actual backend URL when deployed)*

### Frontend Deployment URL
```
FRONTEND_URL = https://your-frontend-domain.com
```
*(Replace with your actual frontend URL when deployed)*

**Recommended Platforms:**
- **Backend:** Railway, Heroku, AWS Lambda, or DigitalOcean
- **Frontend:** Vercel, Netlify, or AWS S3 + CloudFront

---

## 8. Screenshots

### Overview Dashboard
![Dashboard Overview](FRONTEND_URL/screenshots/overview.png)  
*Main dashboard showing stats cards, time series, top authors/domains*

### Semantic Search Results
![Search Results](FRONTEND_URL/screenshots/search.png)  
*Search interface with semantic matching and zero-keyword-overlap examples*

### Network Graph Visualization
![Network Analysis](FRONTEND_URL/screenshots/network.png)  
*Interactive network showing authors and domains with PageRank-sized nodes*

### Topic Clustering
![Topic Clusters](FRONTEND_URL/screenshots/clusters.png)  
*Discovered topic clusters with AI-generated descriptions*

### Chatbot Interface
![Chatbot](FRONTEND_URL/screenshots/chatbot.png)  
*Multi-turn conversational search with semantic grounding*

---

## 9. Video Walkthrough

📹 **Full Dashboard Demo:** [Watch Video](VIDEO_WALKTHROUGH_URL)  
*(Replace with your actual video URL)*

This walkthrough covers:
- Loading and exploring the dataset
- Running semantic searches with zero keyword overlap
- Network analysis and node removal testing
- Topic clustering exploration
- Chatbot interaction
- Performance metrics

---

## Key Technologies

**Backend:**
- FastAPI (async web framework)
- Pandas & NumPy (data manipulation)
- sentence-transformers (embeddings)
- FAISS (similarity search)
- scikit-learn (clustering, PCA)
- NetworkX (graph analysis)
- Anthropic API (LLM summaries)
- UMAP (dimensionality reduction)

**Frontend:**
- React 18
- Vite (bundler)
- Tailwind CSS (styling)
- Recharts (time series)
- react-force-graph-2d (network viz)
- Axios (HTTP client)

---

## Project Structure

```
simppl-dashboard/
├── backend/
│   ├── main.py                 # FastAPI app + routes
│   ├── data_loader.py          # Load & clean Reddit JSON
│   ├── embeddings.py           # Semantic search engine
│   ├── clustering.py           # Topic discovery
│   ├── network.py              # Graph analysis
│   ├── llm.py                  # AI summaries
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Template for secrets
│   └── data/
│       └── data.jsonl          # Reddit posts dataset
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main dashboard layout
│   │   ├── components/         # React components
│   │   ├── lib/
│   │   │   └── api.js          # API client
│   │   └── index.css           # Global styles
│   ├── index.html              # Entry point
│   ├── vite.config.js          # Vite configuration
│   ├── package.json            # JS dependencies
│   └── tailwind.config.js      # Tailwind setup
│
└── README.md                   # This file
```

---

## Performance Notes

- **Data Loading:** ~0.8s (8,799 posts)
- **Semantic Search Index:** Built on first request (~2 minutes for 8,799 embeddings)
- **Network Graph:** Built on first request (~40s)
- **Search Query:** ~100ms average latency
- **Embedding Projection:** ~30s (PCA/UMAP)

---

## Troubleshooting

### "Embeddings not built yet" / "Network not built yet"
These are deferred until first request for performance. Just wait for the first API call to complete.

### LLM summaries show generic fallbacks
Your Anthropic API account may have exhausted evaluation credits. Add a payment method or request more credits at console.anthropic.com.

### CORS errors
The backend has CORS enabled for `*` origins. If still failing, check that:
- Backend is running on `http://localhost:8000`
- Frontend is running on `http://localhost:5173`
- Both URLs match your deployment (if deployed)

### Search returns no results
Try shorter, more specific queries. Very long or abstract queries may not match well.

---

## License & Attribution

This is a research assignment project. Dataset from Reddit r/Anarchism (Jan–Feb 2025).

**Dataset Citation:**
```
Reddit r/Anarchism, archived January–February 2025
Posts analyzed: 8,799
Analysis period: 46 days
```

---

## Contact & Support

For issues or questions:
1. Check the API docs at `http://localhost:8000/docs` (Swagger UI)
2. Review error logs in the terminal running `uvicorn`
3. Inspect browser console for frontend errors

---

**Last Updated:** March 31, 2026  
**Status:** ✅ Running  
**Intern Assignment:** SimPPL Research Engineering
