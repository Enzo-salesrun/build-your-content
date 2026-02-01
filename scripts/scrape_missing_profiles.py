#!/usr/bin/env python3
"""
Scrape posts for all profiles that don't have any posts yet.
Target: 50+ posts per author.
"""

import requests
import time

SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

RAPIDAPI_KEY = "3ac5c62694msh33d053254ae5559p1b9c52jsnca0b3cd22b2c"
RAPIDAPI_HOST = "fresh-linkedin-profile-data.p.rapidapi.com"

# Remaining profiles without posts
MISSING_PROFILES = {
    "gregoiregambatto": "cd734305-2e71-44c2-8f5d-8810d7b997e6",
    "brianedean": "5f1618ed-03ba-4160-a5ce-0afb15bdb963",
    "chrisvoss": "cc6e55c6-21d5-492e-b54f-02e074b8be2c",
    "adamgrant": "46f64e2d-7b06-4e10-b402-dcb1783a6290",
    "daveramsey": "289476c2-25e8-434d-a4b9-1e89823d11c2",
    "jaybaer": "ae361d43-74f5-4a18-9426-be24e1084a61",
    "anthonypompliano": "97c61012-dc51-47ae-b7a5-13bbb3dc2c98",
    "liammartin": "efea226b-253b-4cb9-a48b-df8df7740df3",
    "danmartell": "a69b9935-e8e2-4da4-b85e-140dd3834e54",
    "toinon-georget": "1abe5ba3-7285-4ff3-b373-488570c3e3c7",
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

def fetch_posts(linkedin_id, start=0):
    """Fetch posts from LinkedIn API."""
    url = f"https://{RAPIDAPI_HOST}/get-profile-posts"
    linkedin_url = f"https://www.linkedin.com/in/{linkedin_id}/"
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
        print(f"    Error: {e}")
        return []

def insert_posts(posts, author_id):
    """Insert posts into Supabase."""
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
            print(f"    Insert error: {response.status_code} - {response.text[:100]}")
            return 0
    except Exception as e:
        print(f"    Exception: {e}")
        return 0

def main():
    print(f"🚀 Scraping posts for {len(MISSING_PROFILES)} missing profiles...")
    print("Target: 50+ posts per author\n")
    
    total_inserted = 0
    successful_profiles = 0
    
    for linkedin_id, author_id in MISSING_PROFILES.items():
        print(f"📥 {linkedin_id}...")
        profile_total = 0
        
        # Scrape only first page (50 posts)
        for start in [0]:
            print(f"    Fetching posts...")
            posts = fetch_posts(linkedin_id, start)
            
            if posts:
                inserted = insert_posts(posts, author_id)
                profile_total += inserted
                print(f"    ✅ {inserted} posts")
            else:
                print(f"    No more posts")
                break
            
            time.sleep(1.5)  # Rate limiting
        
        if profile_total > 0:
            successful_profiles += 1
            print(f"    Total: {profile_total} posts\n")
        else:
            print(f"    ⚠️ No posts found\n")
        
        total_inserted += profile_total
        time.sleep(1)  # Additional delay between profiles
    
    print("=" * 50)
    print(f"🎉 Complete!")
    print(f"   Profiles with posts: {successful_profiles}/{len(MISSING_PROFILES)}")
    print(f"   Total posts inserted: {total_inserted}")

if __name__ == "__main__":
    main()
