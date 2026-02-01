#!/usr/bin/env python3
"""
Analyze viral posts to find recurring topics/themes.
Temporary script for topic discovery.
"""

import requests
import re
from collections import Counter

SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

# Keywords to detect themes
THEME_KEYWORDS = {
    "sales_prospection": ["sales", "prospect", "cold", "outbound", "pipeline", "deal", "close", "sdr", "lead gen", "leads"],
    "entrepreneurship": ["entrepreneur", "startup", "founder", "business", "company", "ceo", "build", "scale"],
    "mindset_motivation": ["mindset", "believe", "motivation", "discipline", "hard work", "grind", "hustle", "success"],
    "productivity_habits": ["productivity", "habit", "routine", "morning", "time", "focus", "efficiency", "schedule"],
    "leadership_management": ["leader", "team", "manage", "hire", "culture", "employee", "boss", "decision"],
    "marketing_growth": ["marketing", "brand", "content", "audience", "growth", "viral", "social media", "linkedin"],
    "personal_branding": ["personal brand", "reputation", "visibility", "influence", "thought leader", "creator"],
    "career_advice": ["career", "job", "resume", "interview", "promotion", "salary", "work"],
    "money_finance": ["money", "invest", "wealth", "revenue", "profit", "income", "$", "rich", "financial"],
    "tech_ai": ["ai", "tech", "software", "code", "developer", "automation", "tool", "saas"],
    "storytelling": ["story", "years ago", "remember", "happened", "learned", "mistake", "failed"],
    "networking": ["network", "connect", "relationship", "community", "people"],
    "self_improvement": ["improve", "learn", "grow", "better", "change", "transform"],
    "work_life_balance": ["balance", "burnout", "stress", "health", "family", "life"],
    "communication": ["communicate", "speak", "write", "listen", "conversation", "feedback"],
}

def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

def fetch_all_posts():
    """Fetch all posts content."""
    all_posts = []
    offset = 0
    limit = 500
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
        params = {"select": "content,hook", "offset": offset, "limit": limit}
        response = requests.get(url, headers=get_headers(), params=params)
        
        if response.status_code != 200:
            break
            
        posts = response.json()
        if not posts:
            break
            
        all_posts.extend(posts)
        offset += limit
        print(f"Fetched {len(all_posts)} posts...")
    
    return all_posts

def analyze_themes(posts):
    """Count theme occurrences."""
    theme_counts = Counter()
    
    for post in posts:
        content = (post.get("content", "") + " " + (post.get("hook") or "")).lower()
        
        for theme, keywords in THEME_KEYWORDS.items():
            for keyword in keywords:
                if keyword in content:
                    theme_counts[theme] += 1
                    break  # Count each theme once per post
    
    return theme_counts

def extract_common_words(posts, top_n=100):
    """Extract most common meaningful words."""
    # Stopwords to ignore
    stopwords = set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
        "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
        "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can",
        "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me",
        "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "what", "which",
        "who", "whom", "when", "where", "why", "how", "all", "each", "every", "both", "few",
        "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
        "so", "than", "too", "very", "just", "also", "now", "here", "there", "then", "if",
        "about", "after", "before", "because", "while", "as", "by", "from", "into", "through",
        "during", "until", "against", "between", "without", "under", "over", "again", "further",
        "once", "get", "got", "make", "made", "take", "took", "go", "went", "come", "came",
        "see", "saw", "know", "knew", "think", "thought", "want", "need", "like", "one", "two",
        "first", "new", "way", "even", "back", "still", "well", "many", "much", "any", "say",
        "said", "tell", "told", "ask", "asked", "try", "tried", "let", "put", "keep", "give",
        "gave", "find", "found", "thing", "things", "something", "anything", "nothing", "everything",
        "someone", "anyone", "everyone", "nobody", "everybody", "year", "years", "day", "days",
        "time", "times", "people", "person", "man", "woman", "world", "life", "part", "place",
        "case", "week", "point", "fact", "right", "going", "really", "always", "never", "ever",
        "lot", "getting", "making", "doing", "being", "having", "dont", "didnt", "doesnt", "wont",
        "cant", "couldnt", "shouldnt", "wouldnt", "ive", "youve", "weve", "theyve", "im", "youre",
        "hes", "shes", "its", "were", "theyre", "thats", "whats", "heres", "theres"
    ])
    
    word_counts = Counter()
    
    for post in posts:
        content = post.get("content", "").lower()
        # Extract words (letters only, 4+ chars)
        words = re.findall(r'\b[a-z]{4,}\b', content)
        for word in words:
            if word not in stopwords:
                word_counts[word] += 1
    
    return word_counts.most_common(top_n)

def main():
    print("📊 Analyzing 1272 viral posts for topic discovery...\n")
    
    posts = fetch_all_posts()
    print(f"\n✅ Total posts: {len(posts)}\n")
    
    # Theme analysis
    print("=" * 60)
    print("🎯 THEME ANALYSIS (posts containing theme keywords)")
    print("=" * 60)
    theme_counts = analyze_themes(posts)
    for theme, count in theme_counts.most_common():
        pct = (count / len(posts)) * 100
        bar = "█" * int(pct / 2)
        print(f"{theme:25} {count:4} ({pct:5.1f}%) {bar}")
    
    # Common words
    print("\n" + "=" * 60)
    print("📝 TOP 50 MOST COMMON WORDS")
    print("=" * 60)
    common_words = extract_common_words(posts, 50)
    for i, (word, count) in enumerate(common_words, 1):
        print(f"{i:2}. {word:20} {count:4}")
    
    # Suggested topics for BYS context
    print("\n" + "=" * 60)
    print("💡 SUGGESTED TOPICS FOR BUILD YOUR SALES CONTEXT")
    print("=" * 60)
    print("""
Based on analysis + BYS business (B2B prospection, sales, data):

1. SALES & PROSPECTION
   - Cold outreach, pipeline, closing, SDR, lead generation
   
2. ENTREPRENEURSHIP & BUSINESS
   - Startups, founders, scaling, company building
   
3. MINDSET & MOTIVATION  
   - Discipline, hard work, success mindset, resilience
   
4. PRODUCTIVITY & HABITS
   - Routines, time management, focus, efficiency
   
5. LEADERSHIP & MANAGEMENT
   - Team building, hiring, culture, decision making
   
6. MARKETING & GROWTH
   - Content, branding, audience building, viral growth
   
7. PERSONAL BRANDING
   - LinkedIn presence, thought leadership, visibility
   
8. CAREER & PROFESSIONAL GROWTH
   - Job advice, promotions, skill development
   
9. MONEY & FINANCE
   - Revenue, investment, wealth building
   
10. TECH & AI
    - Automation, tools, SaaS, AI applications
    
11. STORYTELLING & LESSONS
    - Personal stories, failures, learnings
    
12. NETWORKING & RELATIONSHIPS
    - Building connections, community, partnerships
""")

if __name__ == "__main__":
    main()
