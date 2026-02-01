#!/usr/bin/env python3
"""
LinkedIn Content Factory - Database Seeder
Populates viral_posts_bank with LinkedIn posts for RAG.
"""

import os
import sys
import json
import requests
from typing import Optional

try:
    from supabase import create_client, Client
    from openai import OpenAI
except ImportError:
    print("Please install dependencies: pip install supabase openai requests")
    sys.exit(1)

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # Use service_role key for seeding
OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
UNIPILE_TOKEN = os.environ.get("UNIPILE_TOKEN")

def validate_env():
    """Validate required environment variables."""
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_KEY")
    if not OPENAI_KEY:
        missing.append("OPENAI_API_KEY")
    
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        sys.exit(1)

def create_clients():
    """Initialize Supabase and OpenAI clients."""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    openai_client = OpenAI(api_key=OPENAI_KEY)
    return supabase, openai_client

def fetch_linkedin_posts_unipile(account_id: str) -> list:
    """Fetch posts from LinkedIn via Unipile API."""
    if not UNIPILE_TOKEN:
        print("⚠️  UNIPILE_TOKEN not set, skipping Unipile fetch")
        return []
    
    url = f"https://api.unipile.com/api/v1/linkedin/posts"
    headers = {"X-API-KEY": UNIPILE_TOKEN}
    params = {"account_id": account_id, "limit": 50}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json().get('items', [])
    except Exception as e:
        print(f"❌ Error fetching from Unipile: {e}")
        return []

def vectorize_text(openai_client, text: str) -> list:
    """Generate embedding for text using OpenAI."""
    response = openai_client.embeddings.create(
        input=text[:8000],  # Limit to avoid token limits
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def extract_hook(content: str) -> str:
    """Extract hook (first line) from post content."""
    lines = content.strip().split('\n')
    return lines[0] if lines else content[:100]

def seed_sample_data(supabase: Client, openai_client):
    """Seed database with sample viral posts for testing."""
    print("📝 Seeding sample viral posts...")
    
    sample_posts = [
        {
            "content": "J'ai quitté mon CDI à 150K€ pour créer ma boîte.\n\n3 ans plus tard, voici ce que j'ai appris :\n\n1. L'argent ne fait pas le bonheur (mais il aide)\n2. La liberté a un prix\n3. L'échec est le meilleur professeur\n\nEt vous, qu'est-ce qui vous retient ?",
            "metrics": {"likes": 12500, "comments": 890, "shares": 234}
        },
        {
            "content": "Stop aux réunions inutiles.\n\nVoici ma règle des 3P :\n- Purpose (objectif clair)\n- People (les bonnes personnes)\n- Process (durée max 30min)\n\nRésultat : 40% de réunions en moins.",
            "metrics": {"likes": 8900, "comments": 456, "shares": 189}
        },
        {
            "content": "Mon pire échec professionnel ?\n\nJ'ai perdu 500K€ en 6 mois.\n\nVoici comment je m'en suis relevé ⬇️",
            "metrics": {"likes": 15600, "comments": 1200, "shares": 567}
        },
        {
            "content": "Le secret des top performers ?\n\nCe n'est pas le talent.\nCe n'est pas la chance.\n\nC'est la constance.\n\n1% chaque jour = 37x en 1 an.",
            "metrics": {"likes": 23400, "comments": 890, "shares": 1234}
        },
        {
            "content": "J'ai interviewé 100 CEO.\n\nLeur habitude #1 commune :\n\nIls lisent 1h par jour minimum.\n\nPas des emails.\nPas des news.\n\nDes livres.",
            "metrics": {"likes": 18900, "comments": 678, "shares": 890}
        },
        {
            "content": "Arrêtez de chercher la motivation.\n\nCherchez la discipline.\n\nLa motivation vient et part.\nLa discipline reste.",
            "metrics": {"likes": 11200, "comments": 345, "shares": 456}
        },
        {
            "content": "En 2024, j'ai automatisé 80% de mes tâches avec l'IA.\n\nVoici mes 5 outils indispensables :\n\n🔹 ChatGPT pour la rédaction\n🔹 Midjourney pour les visuels\n🔹 Notion AI pour l'organisation\n🔹 Zapier pour l'automatisation\n🔹 Copy.ai pour le marketing\n\nLequel utilisez-vous ?",
            "metrics": {"likes": 9800, "comments": 567, "shares": 234}
        },
        {
            "content": "Le networking n'est pas mort.\n\nIl a juste changé.\n\n❌ Événements superficiels\n✅ Conversations profondes en DM\n\n❌ Collecter des cartes de visite\n✅ Créer de vraies connexions\n\nQualité > Quantité",
            "metrics": {"likes": 7600, "comments": 234, "shares": 189}
        },
        {
            "content": "Mon conseil #1 pour réussir sur LinkedIn :\n\nPostez chaque jour.\n\nPendant 90 jours.\n\nSans exception.\n\nÇa m'a pris 2 ans pour comprendre ça.",
            "metrics": {"likes": 14500, "comments": 890, "shares": 567}
        },
        {
            "content": "Le meilleur investissement de ma vie ?\n\nUn coach.\n\nPas un gourou.\nPas un mentor célèbre.\n\nQuelqu'un qui m'a challengé.\n\nROI : incalculable.",
            "metrics": {"likes": 6700, "comments": 345, "shares": 123}
        }
    ]
    
    for i, post in enumerate(sample_posts, 1):
        content = post["content"]
        print(f"  [{i}/{len(sample_posts)}] Vectorizing: {content[:40]}...")
        
        try:
            embedding = vectorize_text(openai_client, content)
            
            data = {
                "content": content,
                "hook": extract_hook(content),
                "metrics": post["metrics"],
                "embedding": embedding
            }
            
            supabase.table("viral_posts_bank").insert(data).execute()
            print(f"  ✅ Inserted post {i}")
            
        except Exception as e:
            print(f"  ❌ Error inserting post {i}: {e}")

def seed_sample_profiles(supabase: Client):
    """Seed database with sample author profiles."""
    print("👤 Seeding sample profiles...")
    
    profiles = [
        {
            "full_name": "Thomas Dubois",
            "type": "internal",
            "writing_style_prompt": "Tu es un expert en leadership et management. Ton style est direct, inspirant et pragmatique. Tu utilises des listes à puces et des chiffres pour appuyer tes propos. Tu termines souvent par une question engageante.",
            "linkedin_id": "thomas-dubois"
        },
        {
            "full_name": "Marie Laurent",
            "type": "internal",
            "writing_style_prompt": "Tu es une experte en marketing digital et personal branding. Ton style est énergique, moderne et accessible. Tu utilises des emojis avec parcimonie et tu aimes les formats 'liste de X choses'.",
            "linkedin_id": "marie-laurent"
        },
        {
            "full_name": "Alex Chen",
            "type": "external_influencer",
            "writing_style_prompt": "Tu es un thought leader en tech et innovation. Ton style est visionnaire mais terre-à-terre. Tu fais souvent des parallèles entre tech et vie quotidienne. Tu poses des questions provocantes.",
            "linkedin_id": "alex-chen-tech"
        }
    ]
    
    for profile in profiles:
        try:
            supabase.table("profiles").insert(profile).execute()
            print(f"  ✅ Created profile: {profile['full_name']}")
        except Exception as e:
            print(f"  ❌ Error creating profile {profile['full_name']}: {e}")

def create_vector_search_function(supabase: Client):
    """Create the vector similarity search function in Supabase."""
    print("🔧 Creating vector search function...")
    
    sql = """
    CREATE OR REPLACE FUNCTION match_viral_posts(
        query_embedding vector(1536),
        match_threshold float DEFAULT 0.5,
        match_count int DEFAULT 5
    )
    RETURNS TABLE (
        id uuid,
        content text,
        hook text,
        metrics jsonb,
        similarity float
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            viral_posts_bank.id,
            viral_posts_bank.content,
            viral_posts_bank.hook,
            viral_posts_bank.metrics,
            1 - (viral_posts_bank.embedding <=> query_embedding) as similarity
        FROM viral_posts_bank
        WHERE 1 - (viral_posts_bank.embedding <=> query_embedding) > match_threshold
        ORDER BY viral_posts_bank.embedding <=> query_embedding
        LIMIT match_count;
    END;
    $$;
    """
    
    try:
        supabase.rpc('exec_sql', {'sql': sql}).execute()
        print("  ✅ Vector search function created")
    except Exception as e:
        print(f"  ⚠️  Could not create function (may need to run SQL manually): {e}")

def main():
    print("🚀 LinkedIn Content Factory - Database Seeder")
    print("=" * 50)
    
    validate_env()
    supabase, openai_client = create_clients()
    
    print("\n📦 Starting database seeding...\n")
    
    # Seed profiles first
    seed_sample_profiles(supabase)
    print()
    
    # Seed viral posts
    seed_sample_data(supabase, openai_client)
    print()
    
    # Create vector search function
    create_vector_search_function(supabase)
    
    print("\n" + "=" * 50)
    print("✨ Seeding complete!")
    print("\nNext steps:")
    print("  1. Run the SQL migration in Supabase SQL Editor")
    print("  2. Set up your .env file with the API keys")
    print("  3. Start the dev server: npm run dev")

if __name__ == "__main__":
    main()
