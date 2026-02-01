#!/usr/bin/env python3
"""
Classify generated hooks by hook_type using GPT-5.2 API.
Uses OpenAI API for classification with rule-based fallback.
"""

import os
import json
import requests
import time
import re

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qzorivymybqavkxexrbf.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# OpenAI config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Hook types will be fetched from database to stay in sync
HOOK_TYPES = {}

def fetch_hook_types():
    """Fetch hook types from database."""
    global HOOK_TYPES
    url = f"{SUPABASE_URL}/rest/v1/hook_types"
    params = {"select": "id,name,classification_keywords,classification_patterns"}
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    
    if response.status_code == 200:
        for ht in response.json():
            HOOK_TYPES[ht["name"]] = {
                "id": ht["id"],
                "keywords": ht.get("classification_keywords") or [],
                "patterns": ht.get("classification_patterns") or []
            }
    
    # Fallback if fetch fails
    if not HOOK_TYPES:
        HOOK_TYPES.update({
            "bold_claim": {"id": "9d8d9b21-0ca9-4725-85fb-11fd1d7604f8", "keywords": ["this", "everything", "changed", "truth", "reality", "fact", "brutal", "dead", "over"], "patterns": [r"^this", r"^the truth", r"is dead", r"is over"]},
            "contrarian": {"id": "7b223b88-c9ee-4aa7-bdbc-7ef4d4d79ece", "keywords": ["stop", "don't", "never", "wrong", "myth", "lie"], "patterns": [r"^stop", r"^don't", r"^never", r"is a lie"]},
            "curiosity_gap": {"id": "df8d4cbd-6dcc-4c0f-baf5-ec7690a66963", "keywords": ["secret", "nobody", "hidden", "real reason", "exact"], "patterns": [r"secret", r"here's the (exact|real)", r"the hidden"]},
            "direct_address": {"id": "be33fd5c-d47d-44c6-bc91-1e02c86f8403", "keywords": ["you", "your", "tu", "vous", "if you"], "patterns": [r"^you", r"^tu", r"^if you", r"^you're"]},
            "number": {"id": "d7093957-6ec0-49b7-ad59-4df3381a24d6", "keywords": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "%", "$"], "patterns": [r"^\d+", r"\d+%", r"\$\d+"]},
            "pain_point": {"id": "82fd0d2d-c205-4677-9fef-e889dc598e5d", "keywords": ["tired", "frustrated", "struggling", "stuck", "overwhelmed"], "patterns": [r"^tired of", r"^stuck", r"^if you've been"]},
            "question": {"id": "2510d1b6-1896-44fe-bc1f-0730397de9c3", "keywords": ["?", "what if", "how", "why", "do you"], "patterns": [r"\?$", r"^what if", r"^how", r"^why", r"^do you"]},
            "result": {"id": "d41a39f1-768e-42b0-96aa-3ab705da0dfc", "keywords": ["$", "revenue", "generated", "hit", "ARR", "booked"], "patterns": [r"\$\d+", r"hit \$", r"\d+% (reply|conversion)"]},
            "social_proof": {"id": "ebeced27-d0a0-418d-a91a-9413f4fcbe9d", "keywords": ["after", "years of", "helped", "built", "invested"], "patterns": [r"after \d+", r"I've (built|invested|helped)"]},
            "story_opener": {"id": "79dc8a64-063d-4bc3-950a-9c6dbb57ecf3", "keywords": ["years ago", "last week", "yesterday", "spent", "at"], "patterns": [r"^(il y a|last|at \d+|in \d{4})", r"^I spent"]},
            "announcement": {"id": None, "keywords": ["breaking", "announcing", "just", "news", "excited", "launched"], "patterns": [r"^breaking", r"^big news", r"^just (launched|released)"]},
            "confession": {"id": None, "keywords": ["didn't", "had no idea", "failed", "mistake", "raté"], "patterns": [r"^I didn't", r"^I had no idea", r"^I failed", r"^j'ai raté"]},
            "metaphor": {"id": None, "keywords": ["like", "is a", "imagine", "picture"], "patterns": [r"is (a|the|like)", r"like a", r"imagine"]},
            "prediction": {"id": None, "keywords": ["2024", "2025", "2026", "will", "going to", "gonna", "future"], "patterns": [r"^\d{4}:", r"will (be|become)", r"going to"]},
            "case_study": {"id": None, "keywords": ["this", "campaign", "workflow", "system", "framework"], "patterns": [r"^this (campaign|workflow|system)", r"generated \$", r"booked \d+"]},
            "challenge": {"id": None, "keywords": ["waiting for", "why aren't you", "audit", "try"], "patterns": [r"^what are you waiting", r"^audit", r"^try this"]},
            "wisdom": {"id": None, "keywords": ["truth", "lesson", "learned", "rule", "key"], "patterns": [r"(the|a) (truth|lesson|rule|key)", r"I learned"]},
            "teaser": {"id": None, "keywords": ["video", "thread", "guide", "here's", "voici"], "patterns": [r"dans (une|cette) vidéo", r"here's (a|the)", r"⤵️", r"👇"]}
        })

CLASSIFICATION_PROMPT = """Tu es un expert en classification de hooks viraux pour les réseaux sociaux.

Classifie ce hook dans UNE des catégories suivantes:

CATÉGORIES (18 types):
- bold_claim: Affirmation forte et directe (ex: "This changed everything", "The information asymmetry is dead")
- contrarian: Contredit une croyance populaire (ex: "Stop doing X", "I don't believe in work-life balance")
- curiosity_gap: Crée un gap d'information (ex: "Here's the exact formula...", "The hidden cost of...")
- direct_address: S'adresse directement au lecteur (ex: "If you're feeling stuck...", "You're not behind because...")
- number: Commence par un chiffre (ex: "7 truths that will save your startup", "16 steps to...")
- pain_point: Identifie une frustration (ex: "Stuck in a job you hate?", "If you've been exhausted...")
- question: Pose une question engageante (ex: "What if you hit your income goal?", "Do you want to know why...?")
- result: Met en avant un résultat (ex: "lemlist hit $37M ARR", "This campaign gets 73% reply rate")
- social_proof: Utilise la crédibilité (ex: "After 1000+ daily posts...", "I've invested millions in 25+ companies")
- story_opener: Commence une narration (ex: "I spent 16 years making other people wealthy", "At 18, Harry Stebbings started...")
- announcement: Annonce une nouveauté (ex: "BREAKING NEWS: GPT 5.1 is out", "Big news: we just bought Claap")
- confession: Aveu personnel/vulnérabilité (ex: "I didn't have it figured out", "I had no idea I had ADHD until 47")
- metaphor: Métaphore percutante (ex: "We've been selling hammers to people without hands", "Your comfort zone is charging interest")
- prediction: Prédiction sur le futur (ex: "2025: Figma AI is replacing designers", "Live social shopping is gonna explode")
- case_study: Étude de cas avec résultats (ex: "This 4-step ABM system generated $2M", "This GTM workflow booked 1,500+ meetings")
- challenge: Défi au lecteur (ex: "What are you waiting for?", "Audit the sh*t out of what you consume")
- wisdom: Sagesse/insight (ex: "Rich people buy time", "A decision rule that quietly changes your life")
- teaser: Annonce de contenu à venir (ex: "Je vous explique tout dans une vidéo ⤵️", "Here's a quick tip 👇")

HOOK À CLASSIFIER:
"{hook}"

Réponds UNIQUEMENT avec le JSON suivant (pas d'explication):
{{"hook_type": "...", "confidence": 0.XX}}"""


def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }


def fetch_unclassified_hooks(limit=100):
    """Fetch hooks without hook_type_id."""
    url = f"{SUPABASE_URL}/rest/v1/generated_hooks"
    params = {
        "select": "id,text,production_post_id",
        "hook_type_id": "is.null",
        "limit": limit
    }
    response = requests.get(url, headers=get_supabase_headers(), params=params)
    return response.json() if response.status_code == 200 else []


def classify_with_openai(hook_text: str) -> dict:
    """Classify hook using GPT-5.2 API."""
    if not OPENAI_API_KEY:
        return classify_rule_based(hook_text)
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    
    data = {
        "model": "gpt-5.2",
        "messages": [{"role": "user", "content": CLASSIFICATION_PROMPT.format(hook=hook_text[:300])}],
        "temperature": 0.1,
        "max_tokens": 50,
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            text = response.json()["choices"][0]["message"]["content"]
            result = json.loads(text)
            hook_type = result.get("hook_type", "bold_claim")
            if hook_type in HOOK_TYPES:
                return {"hook_type": hook_type, "confidence": result.get("confidence", 0.8)}
    except Exception as e:
        print(f"  OpenAI error: {e}")
    
    return classify_rule_based(hook_text)


def classify_rule_based(hook_text: str) -> dict:
    """Rule-based classification fallback."""
    h = hook_text.lower()
    
    scores = {}
    for hook_type, rules in HOOK_TYPES.items():
        score = 0
        
        # Check keywords
        for keyword in rules["keywords"]:
            if keyword in h:
                score += 1
        
        # Check patterns
        for pattern in rules["patterns"]:
            if re.search(pattern, h, re.IGNORECASE):
                score += 2
        
        scores[hook_type] = score
    
    # Get the type with highest score
    best_type = max(scores, key=scores.get)
    max_score = scores[best_type]
    
    # Default to bold_claim if no strong match
    if max_score == 0:
        best_type = "bold_claim"
    
    confidence = min(0.9, 0.5 + (max_score * 0.1))
    return {"hook_type": best_type, "confidence": confidence}


def update_hook_classification(hook_id: str, hook_type: str):
    """Update hook with classification."""
    url = f"{SUPABASE_URL}/rest/v1/generated_hooks"
    params = {"id": f"eq.{hook_id}"}
    
    hook_type_id = HOOK_TYPES.get(hook_type, HOOK_TYPES["bold_claim"])["id"]
    data = {"hook_type_id": hook_type_id}
    
    response = requests.patch(url, headers=get_supabase_headers(), params=params, json=data)
    return response.status_code in [200, 204]


def classify_hooks_batch(hooks: list) -> list:
    """Classify multiple hooks in a single API call for efficiency."""
    if not OPENAI_API_KEY or len(hooks) == 0:
        return [classify_rule_based(h["text"]) for h in hooks]
    
    hooks_text = "\n".join([f'{i+1}. "{h["text"][:150]}"' for i, h in enumerate(hooks[:10])])
    
    batch_prompt = f"""Classifie ces hooks viraux. Pour chaque hook, donne le type parmi:
bold_claim, contrarian, curiosity_gap, direct_address, number, pain_point, question, result, social_proof, story_opener

HOOKS:
{hooks_text}

Réponds avec un JSON array:
[{{"index": 1, "hook_type": "..."}}, ...]"""

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    
    data = {
        "model": "gpt-5.2",
        "messages": [{"role": "user", "content": batch_prompt}],
        "temperature": 0.1,
        "max_tokens": 200,
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=60)
        if response.status_code == 200:
            text = response.json()["choices"][0]["message"]["content"]
            result = json.loads(text)
            classifications = result if isinstance(result, list) else result.get("classifications", [])
            
            # Map results back to hooks
            results = []
            for i, hook in enumerate(hooks[:10]):
                match = next((c for c in classifications if c.get("index") == i + 1), None)
                if match and match.get("hook_type") in HOOK_TYPES:
                    results.append({"hook_type": match["hook_type"], "confidence": 0.85})
                else:
                    results.append(classify_rule_based(hook["text"]))
            return results
    except Exception as e:
        print(f"  Batch classification error: {e}")
    
    return [classify_rule_based(h["text"]) for h in hooks[:10]]


def main():
    print("🎣 Starting hook classification with GPT-5.2...")
    
    if not SUPABASE_KEY:
        print("❌ Missing SUPABASE_ANON_KEY environment variable")
        return
    
    # Fetch hook types from database
    print("📚 Fetching hook types from database...")
    fetch_hook_types()
    print(f"   Found {len(HOOK_TYPES)} hook types")
    
    total_classified = 0
    batch_num = 0
    
    while True:
        batch_num += 1
        hooks = fetch_unclassified_hooks(limit=50)
        
        if not hooks:
            print("✅ All hooks classified!")
            break
        
        print(f"\n📦 Batch {batch_num}: {len(hooks)} hooks")
        
        # Process in batches of 10 for API efficiency
        for i in range(0, len(hooks), 10):
            batch = hooks[i:i+10]
            
            if OPENAI_API_KEY:
                classifications = classify_hooks_batch(batch)
            else:
                classifications = [classify_rule_based(h["text"]) for h in batch]
            
            for j, (hook, classification) in enumerate(zip(batch, classifications)):
                if update_hook_classification(hook["id"], classification["hook_type"]):
                    total_classified += 1
            
            if OPENAI_API_KEY:
                time.sleep(0.2)  # Rate limit
            
            print(f"  Classified {min(i + 10, len(hooks))}/{len(hooks)}...")
        
        print(f"  ✅ Batch complete")
    
    print(f"\n🎉 Total classified: {total_classified}")


if __name__ == "__main__":
    main()
