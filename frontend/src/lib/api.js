import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

export const getStats = () => api.get('/api/stats').then(r => r.data)

export const getTimeseries = (freq = 'D') =>
  api.get('/api/timeseries', { params: { freq, summarize: true } }).then(r => r.data)

export const getAuthors = (n = 10) =>
  api.get('/api/authors', { params: { n } }).then(r => r.data)

export const getDomains = (n = 10) =>
  api.get('/api/domains', { params: { n } }).then(r => r.data)

export const getClusters = (n_clusters = 5) =>
  api.get('/api/clusters', { params: { n_clusters, summarize: true } }).then(r => r.data)

export const getNetwork = () =>
  api.get('/api/network', { params: { summarize: true } }).then(r => r.data)

export const removeNetworkNode = (node_id) =>
  api.post('/api/network/remove-node', { node_id }).then(r => r.data)

export const semanticSearch = (query, top_k = 5) =>
  api.post('/api/search', { query, top_k }).then(r => r.data)

export const chat = (query, history = []) =>
  api.post('/api/chat', { query, history }).then(r => r.data)

export const getEmbeddings = () =>
  api.get('/api/embeddings').then(r => r.data)

export const getPosts = (limit = 20, offset = 0, sort_by = 'score') =>
  api.get('/api/posts', { params: { limit, offset, sort_by } }).then(r => r.data)