#!/usr/bin/env python3
"""
Insert posts from Lionel Louis and Mathias Prost only.
"""

import requests
import time

SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

RAPIDAPI_KEY = "3ac5c62694msh33d053254ae5559p1b9c52jsnca0b3cd22b2c"
RAPIDAPI_HOST = "fresh-linkedin-profile-data.p.rapidapi.com"

PROFILES = [
    ("https://www.linkedin.com/in/lionel-louis-ll/", "a0fa2e82-3ac3-42af-9e73-2223ae43c551"),
    ("https://www.linkedin.com/in/mathiasprost/", "0727d5d5-8bfe-44d1-a4fb-84202e890451"),
]

def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def get_rapidapi_headers():
    return {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY
    }

def fetch_posts(linkedin_url, start=0):
    url = f"https://{RAPIDAPI_HOST}/get-profile-posts"
    params = {"linkedin_url": linkedin_url, "type": "posts", "start": start}
    
    try:
        response = requests.get(url, headers=get_rapidapi_headers(), params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        posts = []
        for post in data.get("data", []):
            if post.get("reshared") == False and post.get("text"):
                posts.append({
                    "content": post.get("text", ""),
                    "hook": post.get("text", "").split("\n")[0] if post.get("text") else "",
                    "metrics": {
                        "likes": post.get("num_likes", 0),
                        "comments": post.get("num_comments", 0),
                        "reactions": post.get("num_reactions", 0)
                    },
                    "post_url": post.get("post_url")
                })
        return posts
    except Exception as e:
        print(f"  Error: {e}")
        return []

def insert_posts(posts, author_id):
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    
    data = []
    for post in posts:
        data.append({
            "content": post["content"][:5000],
            "hook": post["hook"][:500] if post.get("hook") else post["content"][:100],
            "metrics": post["metrics"],
            "author_id": author_id,
            "post_url": post.get("post_url")
        })
    
    if not data:
        return 0
    
    try:
        response = requests.post(url, headers=get_supabase_headers(), json=data)
        if response.status_code in [200, 201]:
            return len(data)
        else:
            print(f"  Error: {response.status_code}")
            return 0
    except Exception as e:
        print(f"  Exception: {e}")
        return 0

def main():
    print("🚀 Inserting posts from Lionel Louis & Mathias Prost...")
    total = 0
    
    for linkedin_url, author_id in PROFILES:
        name = linkedin_url.split("/in/")[1].rstrip("/")
        print(f"\n📥 Scraping {name}...")
        
        for start in [0, 50, 100, 150]:
            print(f"  Page {start//50 + 1}...")
            posts = fetch_posts(linkedin_url, start)
            
            if posts:
                inserted = insert_posts(posts, author_id)
                total += inserted
                print(f"  ✅ Inserted {inserted} posts")
            else:
                print(f"  No more posts")
                break
            
            time.sleep(1)
    
    print(f"\n🎉 Total inserted: {total}")

if __name__ == "__main__":
    main()
