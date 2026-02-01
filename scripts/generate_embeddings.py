#!/usr/bin/env python3
"""
Generate embeddings for topics using OpenAI API.
Store embeddings in Supabase for vector search.
"""

import os
import json
import requests
import time

SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

def fetch_topics():
    """Fetch all topics with embedding descriptions."""
    url = f"{SUPABASE_URL}/rest/v1/topics"
    params = {"select": "id,name,embedding_description"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    return response.json() if response.status_code == 200 else []

def generate_embedding(text):
    """Generate embedding using OpenAI API."""
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "text-embedding-3-small",
        "input": text
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            return result["data"][0]["embedding"]
    except Exception as e:
        print(f"  ❌ Embedding error: {e}")
    
    return None

def update_topic_embedding(topic_id, embedding):
    """Update topic with embedding vector."""
    url = f"{SUPABASE_URL}/rest/v1/topics"
    params = {"id": f"eq.{topic_id}"}
    
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    
    # Convert embedding to string format for pgvector
    embedding_str = f"[{','.join(map(str, embedding))}]"
    
    data = {"embedding": embedding_str}
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def main():
    print("🧠 Generating embeddings for topics...\n")
    
    topics = fetch_topics()
    print(f"Found {len(topics)} topics\n")
    
    success_count = 0
    
    for topic in topics:
        topic_id = topic["id"]
        name = topic["name"]
        description = topic.get("embedding_description") or topic.get("name", "")
        
        print(f"📌 {name}...")
        
        # Generate embedding
        embedding = generate_embedding(description)
        
        if embedding:
            if update_topic_embedding(topic_id, embedding):
                print(f"  ✅ Saved ({len(embedding)} dimensions)")
                success_count += 1
            else:
                print(f"  ❌ Failed to save")
        else:
            print(f"  ❌ Failed to generate")
        
        time.sleep(0.1)  # Rate limiting
    
    print(f"\n🎉 Complete! {success_count}/{len(topics)} embeddings generated")

if __name__ == "__main__":
    main()
