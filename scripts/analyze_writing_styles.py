#!/usr/bin/env python3
"""
Analyze writing style of each author using GPT-5.2.
Extracts patterns and generates a writing_style_prompt for content generation.
"""

import os
import json
import requests
import re
from collections import Counter

SUPABASE_URL = "https://qzorivymybqavkxexrbf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3JpdnlteWJxYXZreGV4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDQ5NDQsImV4cCI6MjA4NDgyMDk0NH0.tRevIVlGu65uW4zXuRQ2Z_t86QuIDcO20CN-LYtRQk0"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

STYLE_ANALYSIS_PROMPT = """<objective>
Extract a comprehensive writing style profile from LinkedIn posts to enable accurate content generation mimicking this author's voice.
</objective>

<domain_scope>
LinkedIn B2B content analysis. Focus on: tone, structure, vocabulary, formatting patterns, hooks, CTAs.
Do NOT analyze: topic accuracy, factual claims, engagement predictions.
</domain_scope>

<core_principles>
- Style is defined by HOW content is written, not WHAT it says
- Patterns must be observable across multiple posts, not single occurrences
- Quantifiable metrics over subjective impressions
- Actionable prompts over vague descriptions
</core_principles>

<constraints>
- Analyze ONLY the provided posts
- Do NOT invent patterns not present in the data
- If a pattern appears in <3 posts, mark as "occasional" not "signature"
- Language detection: count actual words, don't assume
</constraints>

<input>
Author: {author_name}
Posts sample (15-20 top performing):
{posts}
</input>

<output_contract>
Return ONLY valid JSON matching this exact schema:
{{
  "writing_style_prompt": "string (200-400 words) - A detailed prompt for an LLM to write content mimicking this author. Include: exact tone descriptors, sentence structure patterns, typical post length in words, emoji frequency and placement, hook formulas used, signature phrases to include, formatting rules (line breaks, bullets, spacing), CTA patterns, what to avoid.",
  
  "style_metrics": {{
    "tone": "formel|informel|mixte",
    "language": "fr|en|mixte", 
    "avg_post_length": "court (<300 mots)|moyen (300-600)|long (>600)",
    "emoji_usage": "aucun (0)|rare (1-2)|modéré (3-5)|fréquent (>5)",
    "list_usage": "jamais|parfois (<30%)|souvent (30-70%)|toujours (>70%)",
    "question_hooks": boolean,
    "storytelling": boolean,
    "data_driven": boolean,
    "call_to_action": boolean,
    "personal_anecdotes": boolean
  }},
  
  "signature_elements": {{
    "opening_patterns": ["3-5 exact hook formulas observed"],
    "closing_patterns": ["3-5 exact CTA/closing formulas"],
    "signature_phrases": ["5-10 recurring expressions verbatim"],
    "formatting_style": "string describing line breaks, bullets, spacing patterns"
  }},
  
  "content_themes": ["5 main topics this author covers"]
}}
</output_contract>

<failure_conditions>
- Output is not valid JSON
- writing_style_prompt is <150 or >500 words
- Patterns listed are not actually present in posts
- Metrics contradict observable data
</failure_conditions>"""


def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }


def fetch_authors():
    """Fetch only authors that have posts (using SQL join)."""
    # Direct query to get authors with posts
    authors_with_posts = [
        {"id": "5f1618ed-03ba-4160-a5ce-0afb15bdb963", "linkedin_id": "brianedean", "full_name": "Brian Dean"},
        {"id": "cd734305-2e71-44c2-8f5d-8810d7b997e6", "linkedin_id": "gregoiregambatto", "full_name": "Grégoire Gambatto"},
        {"id": "80239a99-16aa-4d70-9dc9-1adb753c1530", "linkedin_id": "sahilbloom", "full_name": "Sahil Bloom"},
        {"id": "6e69a9c4-0f85-451c-aa03-77b7161f1f62", "linkedin_id": "garyvaynerchuk", "full_name": "Gary Vaynerchuk"},
        {"id": "4a7c0e25-4927-42f2-b746-b6038f98da92", "linkedin_id": "stevenouri", "full_name": "Steve Nouri"},
        {"id": "21f0604f-3178-4280-b12a-6de140be2348", "linkedin_id": "guillaume-moubeche-a026541b2", "full_name": "Guillaume Moubeche"},
        {"id": "78539055-2f7c-441b-8dcf-ce2abc9ab78b", "linkedin_id": "justinwelsh", "full_name": "Justin Welsh"},
        {"id": "956acaeb-bdd8-4199-b8a5-cee53aeab62f", "linkedin_id": "melrobbins", "full_name": "Mel Robbins"},
        {"id": "d8d67089-1a58-47fe-ba8f-d0d0e7df0286", "linkedin_id": "caroline-mignaux", "full_name": "Caroline Mignaux"},
        {"id": "b9ac86a4-35fe-47eb-8371-b28caba0f3c3", "linkedin_id": "alexhormozi", "full_name": "Alex Hormozi"},
        {"id": "c29875b9-d57b-4281-9955-f769eced6117", "linkedin_id": "sethgodin", "full_name": "Seth Godin"},
        {"id": "08572bca-ef32-4f66-9073-d928e587075a", "linkedin_id": "kevin-mlz", "full_name": "Kévin Moënne-Loccoz"},
        {"id": "1e6510d7-f661-4052-8479-695cccac0a5a", "linkedin_id": "jordanchenevier", "full_name": "Jordan Chenevier-Truchet"},
        {"id": "21dfea36-cece-4713-bc80-974069f942f2", "linkedin_id": "lucas-perret", "full_name": "Lucas Perret"},
        {"id": "9cce80c0-5472-44ac-bbcb-1ee04a3cf500", "linkedin_id": "charlestenot", "full_name": "Charles Tenot"},
        {"id": "09cd57e0-3f8b-44d5-ac64-3baed91ab7a8", "linkedin_id": "dharmesh", "full_name": "Dharmesh Shah"},
        {"id": "9b1dbe50-f56b-426a-b997-4aee9deee358", "linkedin_id": "michel-lieben", "full_name": "Michel Lieben"},
        {"id": "f6f12d06-b595-4140-a709-3d038b09df8f", "linkedin_id": "benoitdubos", "full_name": "Benoît Dubos"},
        {"id": "97c61012-dc51-47ae-b7a5-13bbb3dc2c98", "linkedin_id": "anthonypompliano", "full_name": "Anthony Pompliano"},
        {"id": "0727d5d5-8bfe-44d1-a4fb-84202e890451", "linkedin_id": "mathiasprost", "full_name": "Mathias Prost"},
        {"id": "1c63540c-fc0a-415c-ad21-9b399fcd8117", "linkedin_id": "timsoulo", "full_name": "Tim Soulo"},
        {"id": "5bda5259-d4d5-4b89-8e07-02be0e61cd12", "linkedin_id": "erwanxgrowth", "full_name": "Erwan Gauthier"},
        {"id": "a0fa2e82-3ac3-42af-9e73-2223ae43c551", "linkedin_id": "lionel-louis-ll", "full_name": "Lionel Louis"},
        {"id": "1abe5ba3-7285-4ff3-b373-488570c3e3c7", "linkedin_id": "m-anthony-louie-626011359", "full_name": "Toinon Georget"},
        {"id": "a66f2df6-6dd2-49b4-b28e-805b5613a268", "linkedin_id": "talbakerphillips", "full_name": "Tal Baker-Phillips"},
        {"id": "5168ff05-4556-493a-ba5c-e7b1a0df5c26", "linkedin_id": "valentinsulzer", "full_name": "Valentin Sulzer"},
        {"id": "c53542ce-2882-4d0c-aa24-65e673f7d1d6", "linkedin_id": "maximpoulsen", "full_name": "Maxim Poulsen"},
        {"id": "881030a8-7411-436b-a322-d5c4efc780af", "linkedin_id": "omarcherkaoui", "full_name": "Omar Cherkaoui"},
        {"id": "8c7ba0b4-6881-4b4d-a90a-78375e9576c9", "linkedin_id": "nicolas-gromer", "full_name": "Nicolas Gromer"},
        {"id": "ae361d43-74f5-4a18-9426-be24e1084a61", "linkedin_id": "jaybaer", "full_name": "Jay Baer"},
        {"id": "3f4600f7-2300-4aad-905e-2ed21d0f0910", "linkedin_id": "jules-scalezia", "full_name": "Jules Gardair"},
        {"id": "7d4f37a4-c3c8-41d7-b7a2-91d112a18813", "linkedin_id": "joannegriffin", "full_name": "Joanne Griffin"},
        {"id": "43d0408e-b017-4ac4-a3d2-629b0f33770d", "linkedin_id": "neilpatel", "full_name": "Neil Patel"},
        {"id": "479c2cb0-5a9b-47c7-9dc2-41d6fcf771c5", "linkedin_id": "mattbarker1", "full_name": "Matt Barker"},
    ]
    return authors_with_posts


def fetch_top_posts(author_id, limit=20):
    """Fetch top posts by engagement for an author."""
    url = f"{SUPABASE_URL}/rest/v1/viral_posts_bank"
    params = {
        "select": "content,hook,metrics",
        "author_id": f"eq.{author_id}",
        "limit": limit,
        "order": "metrics->reactions.desc"
    }
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    return response.json() if response.status_code == 200 else []


def analyze_patterns(posts):
    """Extract statistical patterns from posts."""
    if not posts:
        return {}
    
    lengths = [len(p.get("content", "")) for p in posts]
    
    emoji_pattern = re.compile(r'[\U0001F300-\U0001F9FF]')
    emoji_counts = [len(emoji_pattern.findall(p.get("content", ""))) for p in posts]
    
    list_patterns = [
        bool(re.search(r'[1-9][.)\-]|•|→|↳|✅|❌', p.get("content", "")))
        for p in posts
    ]
    
    question_hooks = [
        "?" in (p.get("hook", "") or "")[:100]
        for p in posts
    ]
    
    return {
        "avg_length": sum(lengths) / len(lengths) if lengths else 0,
        "avg_emojis": sum(emoji_counts) / len(emoji_counts) if emoji_counts else 0,
        "list_frequency": sum(list_patterns) / len(list_patterns) if list_patterns else 0,
        "question_hook_frequency": sum(question_hooks) / len(question_hooks) if question_hooks else 0,
        "post_count": len(posts)
    }


def analyze_with_gpt(author_name, posts):
    """Use GPT-5.2 Responses API to analyze writing style."""
    if not OPENAI_API_KEY:
        print("  ⚠️ No OpenAI API key, skipping LLM analysis")
        return None
    
    # Prepare posts text (limit to avoid token overflow)
    posts_text = ""
    for i, post in enumerate(posts[:15], 1):
        content = post.get("content", "")[:1000]
        posts_text += f"\n--- POST {i} ---\n{content}\n"
    
    prompt = STYLE_ANALYSIS_PROMPT.format(
        author_name=author_name,
        posts=posts_text
    )
    
    # Use Responses API endpoint
    url = "https://api.openai.com/v1/responses"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "gpt-5.2",
        "input": prompt,
        "store": False
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=90)
        if response.status_code == 200:
            result = response.json()
            
            # Extract text from Responses API format
            output = result.get("output", [])
            content = ""
            for item in output:
                if item.get("type") == "message":
                    for c in item.get("content", []):
                        if c.get("type") == "output_text":
                            content = c.get("text", "")
                            break
            
            # Fallback to output_text helper
            if not content:
                content = result.get("output_text", "")
            
            # Extract JSON from response
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        else:
            print(f"  ❌ API error {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"  ❌ GPT error: {e}")
    
    return None


def update_profile_style(author_id, writing_style_prompt, style_analysis):
    """Update profile with style analysis."""
    url = f"{SUPABASE_URL}/rest/v1/profiles"
    params = {"id": f"eq.{author_id}"}
    
    data = {
        "writing_style_prompt": writing_style_prompt,
        "style_analysis": style_analysis
    }
    
    headers = get_supabase_headers()
    headers["Prefer"] = "return=minimal"
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]


def main():
    print("🎨 Analyzing writing styles for all authors...\n")
    
    authors = fetch_authors()
    print(f"Found {len(authors)} authors\n")
    
    for author in authors:
        author_id = author["id"]
        author_name = author["full_name"]
        
        print(f"📝 Analyzing {author_name}...")
        
        # Fetch top posts
        posts = fetch_top_posts(author_id, limit=20)
        if not posts:
            print(f"  ⚠️ No posts found, skipping")
            continue
        
        print(f"  Found {len(posts)} posts")
        
        # Statistical analysis
        patterns = analyze_patterns(posts)
        print(f"  Avg length: {patterns.get('avg_length', 0):.0f} chars")
        print(f"  Avg emojis: {patterns.get('avg_emojis', 0):.1f}")
        print(f"  List usage: {patterns.get('list_frequency', 0)*100:.0f}%")
        
        # LLM analysis
        llm_analysis = analyze_with_gpt(author_name, posts)
        
        if llm_analysis:
            writing_style_prompt = llm_analysis.get("writing_style_prompt", "")
            
            # Combine statistical and LLM analysis
            style_analysis = {
                "statistical": patterns,
                "llm_analysis": llm_analysis.get("style_metrics", {}),
                "signature_elements": llm_analysis.get("signature_elements", {}),
                "content_themes": llm_analysis.get("content_themes", [])
            }
            
            # Update profile
            if update_profile_style(author_id, writing_style_prompt, style_analysis):
                print(f"  ✅ Style saved for {author_name}")
            else:
                print(f"  ❌ Failed to save style")
        else:
            # Fallback: generate basic prompt from patterns
            basic_prompt = f"Écris comme {author_name}. "
            if patterns.get("avg_length", 0) > 1000:
                basic_prompt += "Posts longs et détaillés. "
            elif patterns.get("avg_length", 0) < 500:
                basic_prompt += "Posts courts et percutants. "
            
            if patterns.get("avg_emojis", 0) > 3:
                basic_prompt += "Utilise des emojis fréquemment. "
            
            if patterns.get("list_frequency", 0) > 0.5:
                basic_prompt += "Structure avec des listes. "
            
            style_analysis = {"statistical": patterns}
            update_profile_style(author_id, basic_prompt, style_analysis)
            print(f"  ✅ Basic style saved for {author_name}")
        
        print()
    
    print("🎉 Writing style analysis complete!")


if __name__ == "__main__":
    main()
