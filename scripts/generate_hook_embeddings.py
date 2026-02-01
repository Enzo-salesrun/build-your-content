#!/usr/bin/env python3
"""
Generate embeddings for hook_types using OpenAI API.
"""

import os
import json
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

def fetch_hook_types():
    """Fetch all hook types."""
    url = f"{SUPABASE_URL}/rest/v1/hook_types"
    params = {"select": "id,name,embedding_description"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    return response.json() if response.status_code == 200 else []

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
    return None

def update_hook_type_embedding(hook_type_id, embedding):
    """Update hook type with embedding."""
    url = f"{SUPABASE_URL}/rest/v1/hook_types"
    params = {"id": f"eq.{hook_type_id}"}
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    
    data = {"embedding": embedding}
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def main():
    print("🎣 Generating embeddings for hook_types...\n")
    
    hook_types = fetch_hook_types()
    print(f"Found {len(hook_types)} hook types\n")
    
    if not hook_types:
        # Debug: try direct request
        import requests
        url = f"{SUPABASE_URL}/rest/v1/hook_types?select=id,name,embedding_description"
        resp = requests.get(url, headers=get_supabase_headers())
        print(f"Debug: status={resp.status_code}, response={resp.text[:200]}")
    
    success = 0
    for ht in hook_types:
        name = ht["name"]
        desc = ht.get("embedding_description", "")
        
        if not desc:
            print(f"  ⚠️ {name}: No embedding_description, skipping")
            continue
        
        embedding = generate_embedding(desc)
        if embedding and update_hook_type_embedding(ht["id"], embedding):
            print(f"  ✅ {name}")
            success += 1
        else:
            print(f"  ❌ {name}: Failed")
    
    print(f"\n🎉 Generated {success}/{len(hook_types)} embeddings")

if __name__ == "__main__":
    main()
