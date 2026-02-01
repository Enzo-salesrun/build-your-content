#!/usr/bin/env python3
"""
Generate embeddings for post_structures and audiences using OpenAI API.
"""
import os
import requests

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

def generate_embedding(text):
    """Generate embedding for text using OpenAI."""
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "text-embedding-3-small",
        "input": text
    }
    response = requests.post(url, headers=headers, json=data, timeout=30)
    if response.status_code == 200:
        return response.json()["data"][0]["embedding"]
    print(f"  Error: {response.status_code} - {response.text[:100]}")
    return None

def fetch_items(table):
    """Fetch items from table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"select": "id,name,embedding_description"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    return response.json() if response.status_code == 200 else []

def update_embedding(table, item_id, embedding):
    """Update item with embedding."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"id": f"eq.{item_id}"}
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    data = {"embedding": embedding}
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def process_table(table, emoji):
    """Process a table and generate embeddings."""
    print(f"\n{emoji} Processing {table}...")
    items = fetch_items(table)
    print(f"  Found {len(items)} items")
    
    success = 0
    for item in items:
        name = item["name"]
        desc = item.get("embedding_description", "")
        if not desc:
            print(f"  ⚠️ {name}: No embedding_description, skipping")
            continue
        embedding = generate_embedding(desc)
        if embedding and update_embedding(table, item["id"], embedding):
            print(f"  ✅ {name}")
            success += 1
        else:
            print(f"  ❌ {name}: Failed")
    
    print(f"  🎉 Generated {success}/{len(items)} embeddings")
    return success

def main():
    print("🔧 Generating embeddings for structures and audiences...\n")
    
    structures = process_table("post_structures", "📐")
    audiences = process_table("audiences", "👥")
    
    print(f"\n✅ Complete! Structures: {structures}, Audiences: {audiences}")

if __name__ == "__main__":
    main()
