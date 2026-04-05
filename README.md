
# SimPPL Dashboard - Narrative Analysis Platform

A semantic search + network analysis dashboard for exploring narrative dynamics in online communities.

![Dashboard Overview](frontend/src/assets/Screenshot%20(467).png)

## Overview

Analyze 8,799 Reddit posts from r/Anarchism (Jan–Feb 2025) using semantic embeddings, clustering, and network analysis to understand information flow and community engagement patterns.


## Features

- **Semantic Search** – Find posts by meaning, not keywords
- **Topic Clustering** – Auto-discover themes using KMeans
- **Network Analysis** – Visualize author–domain relationships
- **Time Series Analytics** – Track posting activity and engagement
- **Author & Domain Rankings** – Identify influential voices and sources
- **AI Summaries** – Powered by Claude 3.5 Haiku
- **Interactive Graph** – Click nodes, test network resilience
- **Embedding Visualization** – 2D UMAP projection of posts
- **Chatbot Interface** – Multi-turn semantic Q&A
- **Posts Browser** – Sortable table with full metadata


## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
# Add .env with ANTHROPIC_API_KEY and DATA_PATH
uvicorn main:app --reload --port 8000
```
API available at `http://localhost:8000` | Docs at `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Dashboard available at `http://localhost:5173`


## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | FastAPI, Pandas, FAISS, scikit-learn, NetworkX |
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts |
| **Search** | sentence-transformers (all-MiniLM-L6-v2), FAISS |
| **Clustering** | KMeans (5 clusters) |
| **Network** | PageRank & Betweenness Centrality (NetworkX) |
| **Visualization** | UMAP (2D projection) |
| **LLM** | Claude 3.5 Haiku (Anthropic API) |


## Screenshots

### Semantic Search

![Semantic Search](frontend/src/assets/Screenshot%20(469).png)

*Find posts by meaning without keyword matching*

### Network Graph Analysis

![Network Graph](frontend/src/assets/Screenshot%20(471).png)

*Interactive visualization of author and domain relationships*

### Topic Clustering

![Topic Clusters](frontend/src/assets/Screenshot%20(472).png)

*Automatically discovered topic clusters with AI descriptions*

### Chatbot Interface

![Chatbot](frontend/src/assets/Screenshot%20(470).png)

*Multi-turn conversational search with semantic grounding*

## API Endpoints

**Key Endpoints:**
- `GET /api/stats` – Overview statistics
- `POST /api/search` – Semantic search
- `POST /api/chat` – Chatbot interface
- `GET /api/clusters` – Topic analysis
- `GET /api/network` – Network visualization
- `GET /docs` – Interactive Swagger documentation

## Performance

- **Data Loading:** ~0.8s (8,799 posts)
- **Semantic Index:** Built on first request (~2 min)
- **Network Graph:** Built on first request (~40s)
- **Search Query:** ~100ms latency
- **Embedding Projection:** ~30s (UMAP)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Embeddings not built yet" | Wait for first API call (~2 min) |
| LLM summaries fail | Check Anthropic API key in .env |
| CORS errors | Ensure backend on :8000, frontend on :5173 |
| No search results | Try shorter, specific queries |

## License

Research project analyzing Reddit r/Anarchism (Jan–Feb 2025)  
Dataset: 8,799 posts over 46 days

