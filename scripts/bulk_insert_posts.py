#!/usr/bin/env python3
"""
Bulk insert viral posts with author links into Supabase.
"""

import os
import json
import requests
from pathlib import Path

# Supabase config
SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

# RapidAPI config
RAPIDAPI_KEY = "3ac5c62694msh33d053254ae5559p1b9c52jsnca0b3cd22b2c"
RAPIDAPI_HOST = "fresh-linkedin-profile-data.p.rapidapi.com"

# Author mapping (linkedin_id -> supabase uuid)
AUTHOR_MAP = {
    "alexhormozi": "b9ac86a4-35fe-47eb-8371-b28caba0f3c3",
    "sahilbloom": "80239a99-16aa-4d70-9dc9-1adb753c1530",
    "garyvaynerchuk": "6e69a9c4-0f85-451c-aa03-77b7161f1f62",
    "justinwelsh": "78539055-2f7c-441b-8dcf-ce2abc9ab78b",
    "guillaume-moubeche-a026541b2": "21f0604f-3178-4280-b12a-6de140be2348",
    "neilpatel": "43d0408e-b017-4ac4-a3d2-629b0f33770d",
    "melrobbins": "956acaeb-bdd8-4199-b8a5-cee53aeab62f",
    "dharmesh": "09cd57e0-3f8b-44d5-ac64-3baed91ab7a8",
    "sethgodin": "c29875b9-d57b-4281-9955-f769eced6117",
    "brianedean": "44a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c",
    "chrisvoss": "55b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "adamgrant": "66c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "lionel-louis-ll": "a0fa2e82-3ac3-42af-9e73-2223ae43c551",
    "mathiasprost": "0727d5d5-8bfe-44d1-a4fb-84202e890451",
}

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

def fetch_profile_posts(linkedin_url: str, start: int = 0) -> list:
    """Fetch posts from LinkedIn profile via RapidAPI."""
    url = f"https://{RAPIDAPI_HOST}/get-profile-posts"
    params = {
        "linkedin_url": linkedin_url,
        "type": "posts",
        "start": start
    }
    
    try:
        response = requests.get(url, headers=get_rapidapi_headers(), params=params)
        response.raise_for_status()
        data = response.json()
        
        if data.get("data"):
            posts = []
            for post in data["data"]:
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
        print(f"Error fetching posts: {e}")
    
    return []

def insert_posts_bulk(posts: list, author_id: str):
    """Bulk insert posts into Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    
    # Prepare data with author_id
    data = []
    for post in posts:
        data.append({
            "content": post["content"][:5000],  # Limit content length
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
            print(f"  ✅ Inserted {len(data)} posts")
            return len(data)
        else:
            print(f"  ❌ Error: {response.status_code} - {response.text[:200]}")
            return 0
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return 0

def scrape_and_insert_all():
    """Scrape posts from all profiles and insert into Supabase."""
    
    profiles = [
        ("https://www.linkedin.com/in/alexhormozi/", "alexhormozi"),
        ("https://www.linkedin.com/in/sahilbloom/", "sahilbloom"),
        ("https://www.linkedin.com/in/garyvaynerchuk/", "garyvaynerchuk"),
        ("https://www.linkedin.com/in/justinwelsh/", "justinwelsh"),
        ("https://www.linkedin.com/in/guillaume-moubeche-a026541b2/", "guillaume-moubeche-a026541b2"),
        ("https://www.linkedin.com/in/neilpatel/", "neilpatel"),
        ("https://www.linkedin.com/in/melrobbins/", "melrobbins"),
        ("https://www.linkedin.com/in/dharmesh/", "dharmesh"),
        ("https://www.linkedin.com/in/sethgodin/", "sethgodin"),
        ("https://www.linkedin.com/in/lionel-louis-ll/", "lionel-louis-ll"),
        ("https://www.linkedin.com/in/mathiasprost/", "mathiasprost"),
    ]
    
    total_inserted = 0
    
    for linkedin_url, linkedin_id in profiles:
        author_id = AUTHOR_MAP.get(linkedin_id)
        if not author_id:
            print(f"⚠️ No author_id for {linkedin_id}, skipping...")
            continue
        
        print(f"\n📥 Scraping {linkedin_id}...")
        
        # Fetch multiple pages
        for start in [0, 50, 100]:
            print(f"  Page {start//50 + 1} (start={start})...")
            posts = fetch_profile_posts(linkedin_url, start)
            
            if posts:
                inserted = insert_posts_bulk(posts, author_id)
                total_inserted += inserted
            else:
                print(f"  No more posts at start={start}")
                break
    
    print(f"\n✅ Total posts inserted: {total_inserted}")
    return total_inserted

if __name__ == "__main__":
    print("🚀 Starting bulk post insertion...")
    scrape_and_insert_all()
