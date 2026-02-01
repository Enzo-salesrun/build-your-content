#!/usr/bin/env python3
"""
Classify viral posts by topic, structure, hook_type, and audience using AI.
Uses OpenAI API for classification, with rule-based fallback.
"""

import os
import json
import requests
import time

# Supabase config
SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

# OpenAI config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Reference table IDs (from Supabase)
TOPICS = {
    "business": "d1c540a0-def6-4dcd-8893-19d84cc844eb",
    "career": "394cd59a-93d9-4c0d-b93d-5885f594fe87",
    "finance": "e05ae5e7-123f-4d50-8319-cc403b7ab9bd",
    "leadership": "af543326-c812-4105-ad53-3051277f6f71",
    "marketing": "85fa836f-3d95-46ff-8540-c5b841bb32ba",
    "mindset": "e4c8742e-96e1-4cb9-a66b-2924d3160b01",
    "productivity": "eab89695-fd55-4070-9be8-6ed20b0ad414",
    "sales": "b4e52aef-d406-4a79-bc87-e1c519ed9677",
    "storytelling": "c6a9f6d7-6a87-4d21-82ea-23fa952a099a",
    "tech": "a978fa28-53cf-494c-bb4d-09eedb9b20a3"
}

STRUCTURES = {
    "announcement": "4a93c2c8-ad1b-4abd-ae57-e75d2e5df1ac",
    "comparison": "cea1dda6-bafe-4602-bfc2-7e89076a6450",
    "contrarian": "5d59cc56-f31d-420e-b323-1180b52d90e0",
    "how-to": "cee34a3b-822e-46cb-a083-956b576b51a9",
    "list": "ff972a2f-fee9-41e0-bda8-001fdc2d189d",
    "observation": "31e22864-e69f-4ac5-a431-c74f136cce32",
    "question": "c19d98ad-58ff-41eb-af8d-1b9a858afb14",
    "quote": "cbd4af6b-379c-48a2-b7f9-c7b8fd999f16",
    "story": "05bb51c8-b860-4897-9796-b18b3149178c",
    "thread": "577fa03d-967a-4302-b580-fe3f1a41adf5"
}

HOOK_TYPES = {
    "bold_claim": "9d8d9b21-0ca9-4725-85fb-11fd1d7604f8",
    "contrarian": "7b223b88-c9ee-4aa7-bdbc-7ef4d4d79ece",
    "curiosity_gap": "df8d4cbd-6dcc-4c0f-baf5-ec7690a66963",
    "direct_address": "be33fd5c-d47d-44c6-bc91-1e02c86f8403",
    "number": "d7093957-6ec0-49b7-ad59-4df3381a24d6",
    "pain_point": "82fd0d2d-c205-4677-9fef-e889dc598e5d",
    "question": "2510d1b6-1896-44fe-bc1f-0730397de9c3",
    "result": "d41a39f1-768e-42b0-96aa-3ab705da0dfc",
    "social_proof": "ebeced27-d0a0-418d-a91a-9413f4fcbe9d",
    "story_opener": "79dc8a64-063d-4bc3-950a-9c6dbb57ecf3"
}

AUDIENCES = {
    "creators": "756051b7-4735-4986-8e0e-29a1e4f4ecf9",
    "developers": "6fdfc99d-3f26-4b11-b75d-f95192f07ac0",
    "executives": "66087e32-23c0-4669-81b9-010f769f7d7c",
    "founders": "a54f6dfe-6239-4faa-89f2-14826acc20e2",
    "general": "4f707cb5-0fd3-4071-874e-6ce807af56d9",
    "job_seekers": "bceff059-c1ca-4ee1-8536-d93c4be45d12",
    "managers": "e11ac97d-f1ae-415f-a86d-21bfdec76c12",
    "marketers": "edcab436-8c38-4a11-809a-7c2c5ad69d6a",
    "sales_pros": "2acdb74c-2eca-45cd-9070-268abf7afd00",
    "solopreneurs": "cd361f0d-d75d-46ad-8b53-a4661e2683bd"
}

CLASSIFICATION_PROMPT = """Classify this LinkedIn post. Return ONLY valid JSON.

POST:
{content}

HOOK:
{hook}

Categories:
- topic: mindset|productivity|business|leadership|marketing|sales|career|finance|tech|storytelling
- structure: list|story|contrarian|how-to|question|quote|comparison|thread|observation|announcement
- hook_type: bold_claim|question|number|contrarian|story_opener|result|pain_point|curiosity_gap|social_proof|direct_address
- audience: founders|executives|sales_pros|marketers|creators|developers|managers|job_seekers|solopreneurs|general

JSON only:
{{"topic":"...","structure":"...","hook_type":"...","audience":"..."}}"""


def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }


def fetch_unclassified_posts(limit=100):
    """Fetch posts without topic_id."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {
        "select": "id,content,hook",
        "topic_id": "is.null",
        "limit": limit
    }
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    return response.json() if response.status_code == 200 else []


def classify_with_openai(content: str, hook: str) -> dict:
    """Classify using OpenAI API."""
    if not OPENAI_API_KEY:
        return classify_rule_based(content, hook)
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    
    data = {
        "model": "gpt-5.2",
        "messages": [{"role": "user", "content": CLASSIFICATION_PROMPT.format(
            content=content[:1500], hook=hook[:200]
        )}],
        "temperature": 0.1,
        "max_tokens": 80
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            text = response.json()["choices"][0]["message"]["content"]
            # Extract JSON from response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
    except Exception as e:
        print(f"  OpenAI error: {e}")
    
    return classify_rule_based(content, hook)


def classify_rule_based(content: str, hook: str) -> dict:
    """Rule-based classification fallback."""
    c = content.lower()
    h = hook.lower()
    
    # Topic
    topic = "mindset"
    if any(w in c for w in ["startup", "company", "business", "entrepreneur", "founder"]):
        topic = "business"
    elif any(w in c for w in ["sales", "prospect", "cold", "outbound", "deal", "close"]):
        topic = "sales"
    elif any(w in c for w in ["marketing", "brand", "content", "audience", "growth"]):
        topic = "marketing"
    elif any(w in c for w in ["lead", "team", "manage", "hire", "culture"]):
        topic = "leadership"
    elif any(w in c for w in ["productivity", "time", "habit", "routine", "morning"]):
        topic = "productivity"
    elif any(w in c for w in ["career", "job", "resume", "interview"]):
        topic = "career"
    elif any(w in c for w in ["money", "invest", "wealth", "revenue", "$"]):
        topic = "finance"
    elif any(w in c for w in ["ai", "tech", "software", "code", "developer"]):
        topic = "tech"
    elif any(w in c for w in ["story", "years ago", "remember when", "happened"]):
        topic = "storytelling"
    
    # Structure
    structure = "observation"
    if any(x in content for x in ["1.", "2.", "3.", "1)", "•", "→", "↳"]):
        structure = "list"
    elif any(w in c for w in ["years ago", "last week", "once", "remember"]):
        structure = "story"
    elif any(w in h for w in ["stop", "don't", "never", "wrong", "myth"]):
        structure = "contrarian"
    elif any(w in c for w in ["step", "how to", "here's how", "guide"]):
        structure = "how-to"
    elif "?" in hook:
        structure = "question"
    elif '"' in hook:
        structure = "quote"
    elif any(w in c for w in ["vs", "before", "after", "amateur", "pro"]):
        structure = "comparison"
    
    # Hook type
    hook_type = "bold_claim"
    if "?" in hook:
        hook_type = "question"
    elif any(c.isdigit() for c in hook[:15]):
        hook_type = "number"
    elif any(w in h for w in ["stop", "don't", "never"]):
        hook_type = "contrarian"
    elif any(w in h for w in ["year", "week", "day", "once"]):
        hook_type = "story_opener"
    elif any(w in h for w in ["$", "revenue", "generated"]):
        hook_type = "result"
    elif any(w in h for w in ["you", "your"]):
        hook_type = "direct_address"
    
    # Audience
    audience = "founders"
    if any(w in c for w in ["sales", "sdr", "prospect", "cold call"]):
        audience = "sales_pros"
    elif any(w in c for w in ["marketing", "brand", "content"]):
        audience = "marketers"
    elif any(w in c for w in ["developer", "code", "engineer"]):
        audience = "developers"
    elif any(w in c for w in ["ceo", "executive", "c-level"]):
        audience = "executives"
    elif any(w in c for w in ["creator", "influencer", "audience"]):
        audience = "creators"
    elif any(w in c for w in ["freelance", "solo", "one-person"]):
        audience = "solopreneurs"
    elif any(w in c for w in ["job", "career", "interview", "resume"]):
        audience = "job_seekers"
    
    return {"topic": topic, "structure": structure, "hook_type": hook_type, "audience": audience}


def update_post_classification(post_id: str, classification: dict):
    """Update post with classification IDs."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {"id": f"eq.{post_id}"}
    
    data = {
        "topic_id": TOPICS.get(classification.get("topic"), TOPICS["mindset"]),
        "structure_id": STRUCTURES.get(classification.get("structure"), STRUCTURES["observation"]),
        "hook_type_id": HOOK_TYPES.get(classification.get("hook_type"), HOOK_TYPES["bold_claim"]),
        "audience_id": AUDIENCES.get(classification.get("audience"), AUDIENCES["founders"])
    }
    
    response = requests.patch(url, headers=get_supabase_headers(), params=params, json=data)
    return response.status_code in [200, 204]


def main():
    print("🚀 Starting post classification...")
    
    total_classified = 0
    batch_num = 0
    
    while True:
        batch_num += 1
        posts = fetch_unclassified_posts(limit=50)
        
        if not posts:
            print("✅ All posts classified!")
            break
        
        print(f"\n📦 Batch {batch_num}: {len(posts)} posts")
        
        for i, post in enumerate(posts):
            classification = classify_rule_based(post["content"], post["hook"] or "")
            
            # Use OpenAI if available
            if OPENAI_API_KEY:
                classification = classify_with_openai(post["content"], post["hook"] or "")
                time.sleep(0.1)  # Rate limit
            
            if update_post_classification(post["id"], classification):
                total_classified += 1
                if (i + 1) % 10 == 0:
                    print(f"  Classified {i + 1}/{len(posts)}...")
        
        print(f"  ✅ Batch complete: {len(posts)} posts")
    
    print(f"\n🎉 Total classified: {total_classified}")


if __name__ == "__main__":
    main()
