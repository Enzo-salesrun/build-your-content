#!/usr/bin/env python3
"""
Classify posts by topic AND hook_type using embeddings + vector similarity.
Uses OpenAI embeddings to match posts to the closest topic and hook type.
"""

import os
import json
import requests
import time
import numpy as np
import sys

SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Cache for embeddings
TOPIC_CACHE = {}
HOOK_TYPE_CACHE = {}
STRUCTURE_CACHE = {}
AUDIENCE_CACHE = {}

# Supported modes: topic, hook, structure, audience
SUPPORTED_MODES = ["topic", "hook", "structure", "audience"]

def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

def fetch_topics_with_embeddings():
    """Fetch all topics with their embeddings."""
    url = f"{SUPABASE_URL}/rest/v1/topics"
    params = {"select": "id,name,embedding"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    
    if response.status_code == 200:
        topics = response.json()
        for topic in topics:
            if topic.get("embedding"):
                emb = topic["embedding"]
                if isinstance(emb, str):
                    emb = json.loads(emb.replace("[", "[").replace("]", "]"))
                TOPIC_CACHE[topic["id"]] = {
                    "name": topic["name"],
                    "embedding": np.array(emb)
                }
        return True
    return False

def fetch_hook_types_with_embeddings():
    """Fetch all hook types with their embeddings."""
    url = f"{SUPABASE_URL}/rest/v1/hook_types"
    params = {"select": "id,name,embedding"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    
    if response.status_code == 200:
        hook_types = response.json()
        for ht in hook_types:
            if ht.get("embedding"):
                emb = ht["embedding"]
                if isinstance(emb, str):
                    emb = json.loads(emb.replace("[", "[").replace("]", "]"))
                HOOK_TYPE_CACHE[ht["id"]] = {
                    "name": ht["name"],
                    "embedding": np.array(emb)
                }
        return True
    return False

def fetch_structures_with_embeddings():
    """Fetch all post structures with their embeddings."""
    url = f"{SUPABASE_URL}/rest/v1/post_structures"
    params = {"select": "id,name,embedding"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    
    if response.status_code == 200:
        structures = response.json()
        for s in structures:
            if s.get("embedding"):
                emb = s["embedding"]
                if isinstance(emb, str):
                    emb = json.loads(emb.replace("[", "[").replace("]", "]"))
                STRUCTURE_CACHE[s["id"]] = {
                    "name": s["name"],
                    "embedding": np.array(emb)
                }
        return True
    return False

def fetch_audiences_with_embeddings():
    """Fetch all audiences with their embeddings."""
    url = f"{SUPABASE_URL}/rest/v1/audiences"
    params = {"select": "id,name,embedding"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    
    if response.status_code == 200:
        audiences = response.json()
        for a in audiences:
            if a.get("embedding"):
                emb = a["embedding"]
                if isinstance(emb, str):
                    emb = json.loads(emb.replace("[", "[").replace("]", "]"))
                AUDIENCE_CACHE[a["id"]] = {
                    "name": a["name"],
                    "embedding": np.array(emb)
                }
        return True
    return False

def fetch_unclassified_posts(limit=100, mode="topic"):
    """Fetch posts without classification based on mode."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {
        "select": "id,content,hook",
        "limit": limit
    }
    if mode == "topic":
        params["topic_id"] = "is.null"
    elif mode == "hook":
        params["hook_type_id"] = "is.null"
    elif mode == "structure":
        params["structure_id"] = "is.null"
    elif mode == "audience":
        params["audience_id"] = "is.null"
    
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    return response.json() if response.status_code == 200 else []

def generate_embeddings_batch(texts):
    """Generate embeddings for multiple texts in one API call (up to 2048 inputs)."""
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Limit text length for each input
    cleaned_texts = [(t[:2000] if t else "") for t in texts]
    
    data = {
        "model": "text-embedding-3-small",
        "input": cleaned_texts
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=60)
        if response.status_code == 200:
            result = response.json()
            # Return embeddings in order
            embeddings = [None] * len(texts)
            for item in result["data"]:
                embeddings[item["index"]] = np.array(item["embedding"])
            return embeddings
    except Exception as e:
        print(f"  ❌ Batch embedding error: {e}")
    
    return [None] * len(texts)

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def find_best_topic(post_embedding):
    """Find the topic with highest similarity to post."""
    best_topic_id = None
    best_score = -1
    
    for topic_id, topic_data in TOPIC_CACHE.items():
        score = cosine_similarity(post_embedding, topic_data["embedding"])
        if score > best_score:
            best_score = score
            best_topic_id = topic_id
    
    return best_topic_id, best_score

def find_best_hook_type(post_embedding):
    """Find the hook type with highest similarity to post."""
    best_id = None
    best_score = -1
    
    for ht_id, ht_data in HOOK_TYPE_CACHE.items():
        score = cosine_similarity(post_embedding, ht_data["embedding"])
        if score > best_score:
            best_score = score
            best_id = ht_id
    
    return best_id, best_score

def find_best_structure(post_embedding):
    """Find the structure with highest similarity to post."""
    best_id = None
    best_score = -1
    
    for s_id, s_data in STRUCTURE_CACHE.items():
        score = cosine_similarity(post_embedding, s_data["embedding"])
        if score > best_score:
            best_score = score
            best_id = s_id
    
    return best_id, best_score

def find_best_audience(post_embedding):
    """Find the audience with highest similarity to post."""
    best_id = None
    best_score = -1
    
    for a_id, a_data in AUDIENCE_CACHE.items():
        score = cosine_similarity(post_embedding, a_data["embedding"])
        if score > best_score:
            best_score = score
            best_id = a_id
    
    return best_id, best_score

def update_post_topic(post_id, topic_id):
    """Update post with classified topic."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {"id": f"eq.{post_id}"}
    
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    
    data = {"topic_id": topic_id}
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def update_post_hook_type(post_id, hook_type_id):
    """Update post with classified hook type."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {"id": f"eq.{post_id}"}
    
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    
    data = {"hook_type_id": hook_type_id}
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def update_post_structure(post_id, structure_id):
    """Update post with classified structure."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {"id": f"eq.{post_id}"}
    
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    
    data = {"structure_id": structure_id}
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def update_post_audience(post_id, audience_id):
    """Update post with classified audience."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {"id": f"eq.{post_id}"}
    
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    
    data = {"audience_id": audience_id}
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def update_posts_batch(updates, mode="topic"):
    """Update multiple posts in batch."""
    success = 0
    for post_id, type_id in updates:
        if mode == "topic":
            if update_post_topic(post_id, type_id):
                success += 1
        elif mode == "hook":
            if update_post_hook_type(post_id, type_id):
                success += 1
        elif mode == "structure":
            if update_post_structure(post_id, type_id):
                success += 1
        elif mode == "audience":
            if update_post_audience(post_id, type_id):
                success += 1
    return success

def main():
    # Check command line args for mode
    mode = "topic"
    if len(sys.argv) > 1 and sys.argv[1] in SUPPORTED_MODES:
        mode = sys.argv[1]
    
    # Setup based on mode
    mode_config = {
        "topic": {
            "emoji": "🏷️",
            "label": "TOPIC",
            "fetch": fetch_topics_with_embeddings,
            "cache": TOPIC_CACHE,
            "find_best": find_best_topic,
            "use_hook_only": False
        },
        "hook": {
            "emoji": "🎣",
            "label": "HOOK TYPE",
            "fetch": fetch_hook_types_with_embeddings,
            "cache": HOOK_TYPE_CACHE,
            "find_best": find_best_hook_type,
            "use_hook_only": True
        },
        "structure": {
            "emoji": "📐",
            "label": "STRUCTURE",
            "fetch": fetch_structures_with_embeddings,
            "cache": STRUCTURE_CACHE,
            "find_best": find_best_structure,
            "use_hook_only": False
        },
        "audience": {
            "emoji": "👥",
            "label": "AUDIENCE",
            "fetch": fetch_audiences_with_embeddings,
            "cache": AUDIENCE_CACHE,
            "find_best": find_best_audience,
            "use_hook_only": False
        }
    }
    
    cfg = mode_config[mode]
    print(f"{cfg['emoji']} Classifying posts by {cfg['label']} using BATCH embeddings...\n")
    print(f"Loading {mode} embeddings...")
    
    if not cfg["fetch"]():
        print(f"❌ Failed to load {mode}")
        return
    
    cache = cfg["cache"]
    print(f"✅ Loaded {len(cache)} {mode} embeddings\n")
    
    find_best = cfg["find_best"]
    use_hook_only = cfg["use_hook_only"]
    
    total_classified = 0
    batch_num = 0
    BATCH_SIZE = 100
    
    while True:
        batch_num += 1
        
        posts = fetch_unclassified_posts(limit=BATCH_SIZE, mode=mode)
        if not posts:
            print("✅ No more unclassified posts!")
            break
        
        print(f"📦 Batch {batch_num}: {len(posts)} posts...")
        
        # For hook classification, use only the hook text (first line)
        if use_hook_only:
            texts = [post.get("hook", "") or (post.get("content", "") or "").split("\n")[0] for post in posts]
        else:
            texts = [post.get("content", "") or post.get("hook", "") for post in posts]
        
        embeddings = generate_embeddings_batch(texts)
        
        updates = []
        for i, post in enumerate(posts):
            if embeddings[i] is not None:
                type_id, score = find_best(embeddings[i])
                if type_id:
                    updates.append((post["id"], type_id))
        
        success = update_posts_batch(updates, mode=mode)
        total_classified += success
        
        print(f"  ✅ {success} classified | Total: {total_classified}")
    
    print(f"\n🎉 Classification complete! {total_classified} posts classified by {cfg['label']}.")

if __name__ == "__main__":
    main()
