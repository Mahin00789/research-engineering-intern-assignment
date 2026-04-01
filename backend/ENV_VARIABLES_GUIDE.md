# Environment Variables for Render Deployment

## Where to Set Them

**Render Dashboard:**
1. Go to your service page
2. Click **Settings** (top menu)
3. Scroll down to **Environment**
4. Click **Add Environment Variable**
5. Fill in Key and Value
6. Render auto-redeploys

---

## Required Variables

### 1. ANTHROPIC_API_KEY (REQUIRED)

**Key:** `ANTHROPIC_API_KEY`  
**Value:** Your API key from https://console.anthropic.com

**Get your key:**
1. Log in to https://console.anthropic.com
2. Go to **API Keys** section
3. Click **Create Key** (or copy existing key)
4. Copy the full key (starts with `sk-ant-v1-`)

**Example:**
```
ANTHROPIC_API_KEY = sk-ant-v1-0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sTuV
```

**Why it's needed:** The `main.py` imports Claude for LLM features (chart summarization, chatbot). Without this, those endpoints will gracefully fallback to data-driven summaries, but the app won't crash.

---

## Optional Variables

### 2. DATA_PATH

**Key:** `DATA_PATH`  
**Value:** `./data/data.jsonl`

**Note:** This is already set in `render.yaml`, but you can override it here if needed.

**Default (if not set):** `./data/dataset.jsonl`

---

### 3. ALLOWED_ORIGINS

**Key:** `ALLOWED_ORIGINS`  
**Value:** comma-separated list of allowed domains

**For local development:**
```
ALLOWED_ORIGINS = http://localhost:5173,http://localhost:3000
```

**For production:**
```
ALLOWED_ORIGINS = https://yourdomain.com,https://www.yourdomain.com
```

**For development (allow all):**
```
ALLOWED_ORIGINS = *
```

**Default (if not set):** `*` (allows all origins)

**Why it matters:**
- Prevents CORS errors when frontend calls backend
- Restricts who can access your API
- Security best practice for production

---

## Complete Example Setup

### Development (Free Tier Test)

```
ANTHROPIC_API_KEY = sk-ant-v1-xxxxxxx...
DATA_PATH = ./data/data.jsonl
ALLOWED_ORIGINS = *
```

### Production

```
ANTHROPIC_API_KEY = sk-ant-v1-xxxxxxx...
DATA_PATH = ./data/data.jsonl
ALLOWED_ORIGINS = https://yourdomain.com,https://www.yourdomain.com
```

---

## How to Find Your ANTHROPIC_API_KEY

### Step 1: Sign Up / Log In
Go to https://console.anthropic.com

### Step 2: Navigate to API Keys
- Click your profile icon (top right)
- Select "API keys" or go directly to https://console.anthropic.com/dashboard/api_keys

### Step 3: Create a Key (if needed)
- Click "Create Key"
- Give it a name (e.g., "Render Backend")
- Copy the key immediately (it won't be shown again!)

### Step 4: Copy to Render
- The key looks like: `sk-ant-v1-0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sTuV...`
- Paste it into Render's `ANTHROPIC_API_KEY` field

---

## Verify Variables Are Set

### Method 1: Render Dashboard
1. Go to your service
2. Settings → Environment
3. You should see all 3 variables listed

### Method 2: Test with curl
```bash
# This won't show the actual values, but proves the app can access them
curl https://simppl-dashboard-backend.onrender.com/health

# Should return:
# {"status":"ok","posts_loaded":8799,"index_ready":false}
```

### Method 3: Check Logs
```bash
# In Render dashboard, go to Logs tab
# Look for messages like:
# "INFO:main:Loading dataset..."
# "INFO:main:Dataset loaded: 8799 posts"
```

---

## Troubleshooting Variables

### "ANTHROPIC_API_KEY not found"

**Error:** App crashes when accessing `/api/chat` or `/api/clusters`

**Fix:**
1. Go to Render Dashboard
2. Settings → Environment
3. Add `ANTHROPIC_API_KEY = sk-ant-v1-...`
4. Wait for Render to redeploy (auto-redeploy)

### "Endpoints returning 503"

**Cause:** ANTHROPIC_API_KEY not set, app can't initialize

**Fix:**
1. Verify the key exists in Render dashboard
2. Verify the key is valid at https://console.anthropic.com
3. Restart service: Dashboard → Manual Deploy → Deploy

### "CORS errors from frontend"

**Error:** Frontend can't call backend (403 or CORS error)

**Fix:**
1. Set `ALLOWED_ORIGINS` to your frontend domain:
   ```
   ALLOWED_ORIGINS = https://your-frontend-url.com
   ```
2. Save and wait for redeploy

### "No credit available"

**Error:** LLM features fail (but don't crash)

**Fix:**
1. Add credits to Anthropic account at https://console.anthropic.com/settings/billing
2. Or use the graceful fallback (app automatically returns data-driven summaries)

---

## Variable Priority

Variables are read in this order (first found wins):

1. **Render Environment Variables** (highest priority)
2. **render.yaml** (medium priority)
3. **System environment variables** (if running locally)
4. **Code defaults** (lowest priority)

---

## Security Notes

⚠️ **DO NOT**:
- Commit `.env` file to GitHub (it's in `.gitignore`)
- Share your `ANTHROPIC_API_KEY` in messages/issues
- Use test keys in production

✓ **DO**:
- Set sensitive vars (ANTHROPIC_API_KEY) in Render dashboard
- Rotate keys periodically
- Use different keys for dev/prod if possible

---

## Testing Variables Without Deployment

To test locally before deploying:

**Create `backend/.env`:**
```
ANTHROPIC_API_KEY=sk-ant-v1-xxxxxxx...
DATA_PATH=./data/data.jsonl
ALLOWED_ORIGINS=http://localhost:5173
```

**Then run:**
```bash
cd backend
python -m dotenv load  # Load .env
python -m uvicorn main:app --reload
```

(The `.env` file is in `.gitignore`, so it won't be pushed to GitHub)

---

## Common Values

### ANTHROPIC_API_KEY
- **Format:** `sk-ant-v1-` followed by random characters
- **Length:** Usually 40+ characters
- **Source:** https://console.anthropic.com

### DATA_PATH
- **Local dev:** `./data/data.jsonl` or `./data/dataset.jsonl`
- **Production:** `./data/data.jsonl` (relative to app root)
- **Size:** 31MB (included in Git repo)

### ALLOWED_ORIGINS
- **Single domain:** `https://yourdomain.com`
- **Multiple domains:** `https://yourdomain.com,https://www.yourdomain.com`
- **All origins:** `*` or empty string
- **Localhost dev:** `http://localhost:5173,http://localhost:3000`

---

## Still Need Help?

1. Check Render Dashboard → Logs tab for error messages
2. Verify variable is actually set (typos matter!)
3. Check value is complete and correct
4. Try restarting: Manual Deploy → Deploy
5. Test health endpoint: `curl https://servername.onrender.com/health`

---

**Remember:** Most vars are optional. Only `ANTHROPIC_API_KEY` is truly required.
