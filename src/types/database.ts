export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audiences: {
        Row: {
          color: string | null
          company_sizes: string[] | null
          created_at: string | null
          description: string | null
          embedding: string | null
          embedding_description: string | null
          example_hooks: string[] | null
          goals: string[] | null
          id: string
          industries: string[] | null
          is_active: boolean | null
          job_titles: string[] | null
          name: string
          objections: string[] | null
          pain_points: string[] | null
          preferred_content_types: string[] | null
          seniority_levels: string[] | null
          slug: string | null
          tone_preferences: string | null
          updated_at: string | null
          vocabulary_to_avoid: string[] | null
          vocabulary_to_use: string[] | null
        }
        Insert: {
          color?: string | null
          company_sizes?: string[] | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          example_hooks?: string[] | null
          goals?: string[] | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          job_titles?: string[] | null
          name: string
          objections?: string[] | null
          pain_points?: string[] | null
          preferred_content_types?: string[] | null
          seniority_levels?: string[] | null
          slug?: string | null
          tone_preferences?: string | null
          updated_at?: string | null
          vocabulary_to_avoid?: string[] | null
          vocabulary_to_use?: string[] | null
        }
        Update: {
          color?: string | null
          company_sizes?: string[] | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          example_hooks?: string[] | null
          goals?: string[] | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          job_titles?: string[] | null
          name?: string
          objections?: string[] | null
          pain_points?: string[] | null
          preferred_content_types?: string[] | null
          seniority_levels?: string[] | null
          slug?: string | null
          tone_preferences?: string | null
          updated_at?: string | null
          vocabulary_to_avoid?: string[] | null
          vocabulary_to_use?: string[] | null
        }
        Relationships: []
      }
      content_sources: {
        Row: {
          created_at: string | null
          id: string
          raw_text: string
          summary: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          raw_text: string
          summary?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_text?: string
          summary?: string | null
        }
        Relationships: []
      }
      generated_hooks: {
        Row: {
          created_at: string | null
          generation_batch: number | null
          hook_type_id: string | null
          id: string
          is_selected: boolean | null
          production_post_id: string | null
          score: number | null
          text: string
        }
        Insert: {
          created_at?: string | null
          generation_batch?: number | null
          hook_type_id?: string | null
          id?: string
          is_selected?: boolean | null
          production_post_id?: string | null
          score?: number | null
          text: string
        }
        Update: {
          created_at?: string | null
          generation_batch?: number | null
          hook_type_id?: string | null
          id?: string
          is_selected?: boolean | null
          production_post_id?: string | null
          score?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_hooks_production_post_id_fkey"
            columns: ["production_post_id"]
            isOneToOne: false
            referencedRelation: "production_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      hook_types: {
        Row: {
          classification_keywords: string[] | null
          classification_patterns: string[] | null
          created_at: string | null
          description: string | null
          embedding: string | null
          embedding_description: string | null
          examples: string[] | null
          formula: string | null
          id: string
          name: string
          prompt_instruction: string | null
        }
        Insert: {
          classification_keywords?: string[] | null
          classification_patterns?: string[] | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          examples?: string[] | null
          formula?: string | null
          id?: string
          name: string
          prompt_instruction?: string | null
        }
        Update: {
          classification_keywords?: string[] | null
          classification_patterns?: string[] | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          examples?: string[] | null
          formula?: string | null
          id?: string
          name?: string
          prompt_instruction?: string | null
        }
        Relationships: []
      }
      knowledge: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          knowledge_type: Database["public"]["Enums"]["knowledge_type"]
          last_used_at: string | null
          source_name: string | null
          source_url: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          knowledge_type?: Database["public"]["Enums"]["knowledge_type"]
          last_used_at?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          knowledge_type?: Database["public"]["Enums"]["knowledge_type"]
          last_used_at?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          best_practices: string | null
          color: string | null
          config_status: string | null
          created_at: string | null
          format_guidelines: string | null
          icon_name: string | null
          id: string
          max_characters: number
          max_hashtags: number | null
          name: string
          slug: string
          supports_emojis: boolean | null
          supports_links: boolean | null
          supports_mentions: boolean | null
          tone_guidelines: string | null
        }
        Insert: {
          best_practices?: string | null
          color?: string | null
          created_at?: string | null
          format_guidelines?: string | null
          icon_name?: string | null
          id?: string
          max_characters?: number
          max_hashtags?: number | null
          name: string
          slug: string
          supports_emojis?: boolean | null
          supports_links?: boolean | null
          supports_mentions?: boolean | null
          tone_guidelines?: string | null
        }
        Update: {
          best_practices?: string | null
          color?: string | null
          created_at?: string | null
          format_guidelines?: string | null
          icon_name?: string | null
          id?: string
          max_characters?: number
          max_hashtags?: number | null
          name?: string
          slug?: string
          supports_emojis?: boolean | null
          supports_links?: boolean | null
          supports_mentions?: boolean | null
          tone_guidelines?: string | null
        }
        Relationships: []
      }
      post_structures: {
        Row: {
          created_at: string | null
          description: string | null
          embedding: string | null
          embedding_description: string | null
          example: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          example?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          example?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      production_post_ressources: {
        Row: {
          created_at: string | null
          id: string
          position: number | null
          production_post_id: string
          ressource_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position?: number | null
          production_post_id: string
          ressource_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number | null
          production_post_id?: string
          ressource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_post_ressources_production_post_id_fkey"
            columns: ["production_post_id"]
            isOneToOne: false
            referencedRelation: "production_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_post_ressources_ressource_id_fkey"
            columns: ["ressource_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
        ]
      }
      production_posts: {
        Row: {
          ai_body_draft: Json | null
          ai_hooks_draft: Json | null
          author_id: string | null
          created_at: string | null
          id: string
          platform_id: string | null
          publication_date: string | null
          selected_hook_data: Json | null
          source_id: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          target_topic: string | null
          topic_id: string | null
          user_feedback_history: Json | null
        }
        Insert: {
          ai_body_draft?: Json | null
          ai_hooks_draft?: Json | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          platform_id?: string | null
          publication_date?: string | null
          selected_hook_data?: Json | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          target_topic?: string | null
          topic_id?: string | null
          user_feedback_history?: Json | null
        }
        Update: {
          ai_body_draft?: Json | null
          ai_hooks_draft?: Json | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          platform_id?: string | null
          publication_date?: string | null
          selected_hook_data?: Json | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          target_topic?: string | null
          topic_id?: string | null
          user_feedback_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "production_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_posts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_posts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "content_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sync_status: {
        Row: {
          consecutive_failures: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_error_at: string | null
          last_post_date: string | null
          last_scraped_at: string | null
          profile_id: string
          sync_enabled: boolean | null
          sync_priority: number | null
          total_posts_scraped: number | null
          updated_at: string | null
        }
        Insert: {
          consecutive_failures?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_error_at?: string | null
          last_post_date?: string | null
          last_scraped_at?: string | null
          profile_id: string
          sync_enabled?: boolean | null
          sync_priority?: number | null
          total_posts_scraped?: number | null
          updated_at?: string | null
        }
        Update: {
          consecutive_failures?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_error_at?: string | null
          last_post_date?: string | null
          last_scraped_at?: string | null
          profile_id?: string
          sync_enabled?: boolean | null
          sync_priority?: number | null
          total_posts_scraped?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_sync_status_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_engagement: number | null
          created_at: string | null
          full_name: string
          id: string
          last_style_analysis_at: string | null
          linkedin_id: string | null
          posts_count: number | null
          style_analysis: Json | null
          type: Database["public"]["Enums"]["author_type"] | null
          writing_style_embedding: string | null
          writing_style_prompt: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_engagement?: number | null
          created_at?: string | null
          full_name: string
          id?: string
          last_style_analysis_at?: string | null
          linkedin_id?: string | null
          posts_count?: number | null
          style_analysis?: Json | null
          type?: Database["public"]["Enums"]["author_type"] | null
          writing_style_embedding?: string | null
          writing_style_prompt?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_engagement?: number | null
          created_at?: string | null
          full_name?: string
          id?: string
          last_style_analysis_at?: string | null
          linkedin_id?: string | null
          posts_count?: number | null
          style_analysis?: Json | null
          type?: Database["public"]["Enums"]["author_type"] | null
          writing_style_embedding?: string | null
          writing_style_prompt?: string | null
        }
        Relationships: []
      }
      ressource_topics: {
        Row: {
          created_at: string | null
          id: string
          ressource_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ressource_id: string
          topic_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ressource_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ressource_topics_ressource_id_fkey"
            columns: ["ressource_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressource_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      ressource_types: {
        Row: {
          brand_guidelines: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          type: string
          updated_at: string | null
        }
        Insert: {
          brand_guidelines?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          type: string
          updated_at?: string | null
        }
        Update: {
          brand_guidelines?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ressources: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          type_id: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          type_id: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          type_id?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ressources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "ressource_types"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_post_accounts: {
        Row: {
          content_override: string | null
          created_at: string | null
          error_message: string | null
          external_post_id: string | null
          id: string
          published_at: string | null
          scheduled_post_id: string
          status: string | null
          unipile_account_id: string
        }
        Insert: {
          content_override?: string | null
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          published_at?: string | null
          scheduled_post_id: string
          status?: string | null
          unipile_account_id: string
        }
        Update: {
          content_override?: string | null
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          published_at?: string | null
          scheduled_post_id?: string
          status?: string | null
          unipile_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_post_accounts_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_post_accounts_unipile_account_id_fkey"
            columns: ["unipile_account_id"]
            isOneToOne: false
            referencedRelation: "unipile_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          production_post_id: string | null
          published_at: string | null
          scheduled_at: string
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          production_post_id?: string | null
          published_at?: string | null
          scheduled_at: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          production_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_production_post_id_fkey"
            columns: ["production_post_id"]
            isOneToOne: false
            referencedRelation: "production_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          embeddings_updated: number | null
          error_details: Json | null
          error_message: string | null
          hooks_classified: number | null
          id: string
          job_type: string
          posts_new: number | null
          posts_scraped: number | null
          profiles_processed: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          embeddings_updated?: number | null
          error_details?: Json | null
          error_message?: string | null
          hooks_classified?: number | null
          id?: string
          job_type: string
          posts_new?: number | null
          posts_scraped?: number | null
          profiles_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          embeddings_updated?: number | null
          error_details?: Json | null
          error_message?: string | null
          hooks_classified?: number | null
          id?: string
          job_type?: string
          posts_new?: number | null
          posts_scraped?: number | null
          profiles_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          audience_id: string | null
          avg_comments: number | null
          avg_likes: number | null
          body_template: string | null
          created_at: string | null
          cta_template: string | null
          description: string | null
          full_template: string | null
          hook_template: string | null
          hook_type_id: string | null
          id: string
          is_active: boolean | null
          name: string
          source_post_ids: string[] | null
          structure_id: string | null
          topic_id: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          audience_id?: string | null
          avg_comments?: number | null
          avg_likes?: number | null
          body_template?: string | null
          created_at?: string | null
          cta_template?: string | null
          description?: string | null
          full_template?: string | null
          hook_template?: string | null
          hook_type_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          source_post_ids?: string[] | null
          structure_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          audience_id?: string | null
          avg_comments?: number | null
          avg_likes?: number | null
          body_template?: string | null
          created_at?: string | null
          cta_template?: string | null
          description?: string | null
          full_template?: string | null
          hook_template?: string | null
          hook_type_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          source_post_ids?: string[] | null
          structure_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_hook_type_id_fkey"
            columns: ["hook_type_id"]
            isOneToOne: false
            referencedRelation: "hook_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "post_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_knowledge: {
        Row: {
          created_at: string | null
          id: string
          knowledge_id: string
          relevance_score: number | null
          topic_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          knowledge_id: string
          relevance_score?: number | null
          topic_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          knowledge_id?: string
          relevance_score?: number | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_knowledge_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_knowledge_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          embedding: string | null
          embedding_description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unipile_accounts: {
        Row: {
          account_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          organizations: Json | null
          profile_id: string
          provider: Database["public"]["Enums"]["unipile_provider"]
          provider_user_id: string | null
          status: Database["public"]["Enums"]["unipile_account_status"] | null
          unipile_account_id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organizations?: Json | null
          profile_id: string
          provider: Database["public"]["Enums"]["unipile_provider"]
          provider_user_id?: string | null
          status?: Database["public"]["Enums"]["unipile_account_status"] | null
          unipile_account_id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organizations?: Json | null
          profile_id?: string
          provider?: Database["public"]["Enums"]["unipile_provider"]
          provider_user_id?: string | null
          status?: Database["public"]["Enums"]["unipile_account_status"] | null
          unipile_account_id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unipile_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_posts_bank: {
        Row: {
          audience_id: string | null
          author_id: string | null
          content: string
          created_at: string | null
          embedding: string | null
          hook: string | null
          hook_type_id: string | null
          id: string
          last_updated_at: string | null
          metrics: Json | null
          needs_embedding: boolean | null
          needs_hook_classification: boolean | null
          original_post_date: string | null
          post_url: string | null
          scraped_at: string | null
          structure_id: string | null
          topic_id: string | null
        }
        Insert: {
          audience_id?: string | null
          author_id?: string | null
          content: string
          created_at?: string | null
          embedding?: string | null
          hook?: string | null
          hook_type_id?: string | null
          id?: string
          last_updated_at?: string | null
          metrics?: Json | null
          needs_embedding?: boolean | null
          needs_hook_classification?: boolean | null
          original_post_date?: string | null
          post_url?: string | null
          scraped_at?: string | null
          structure_id?: string | null
          topic_id?: string | null
        }
        Update: {
          audience_id?: string | null
          author_id?: string | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          hook?: string | null
          hook_type_id?: string | null
          id?: string
          last_updated_at?: string | null
          metrics?: Json | null
          needs_embedding?: boolean | null
          needs_hook_classification?: boolean | null
          original_post_date?: string | null
          post_url?: string | null
          scraped_at?: string | null
          structure_id?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viral_posts_bank_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_posts_bank_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_posts_bank_hook_type_id_fkey"
            columns: ["hook_type_id"]
            isOneToOne: false
            referencedRelation: "hook_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_posts_bank_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "post_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_posts_bank_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_hooks_with_classification: {
        Args: { p_post_id: string }
        Returns: {
          hook_type_description: string
          hook_type_name: string
          id: string
          is_selected: boolean
          prompt_instruction: string
          score: number
          text: string
        }[]
      }
      get_posts_needing_classification: {
        Args: { max_posts?: number }
        Returns: {
          content: string
          hook: string
          post_id: string
        }[]
      }
      get_posts_needing_embedding: {
        Args: { max_posts?: number }
        Returns: {
          content: string
          hook: string
          post_id: string
        }[]
      }
      get_profiles_to_sync: {
        Args: { max_profiles?: number }
        Returns: {
          full_name: string
          last_scraped_at: string
          linkedin_id: string
          profile_id: string
          sync_priority: number
        }[]
      }
      match_viral_posts: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          hook: string
          id: string
          metrics: Json
          similarity: number
        }[]
      }
      trigger_profile_sync: { Args: never; Returns: undefined }
      update_profile_stats: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
    }
    Enums: {
      author_type: "internal" | "external_influencer"
      knowledge_type:
        | "product"
        | "case_study"
        | "testimonial"
        | "methodology"
        | "statistics"
        | "faq"
        | "talking_points"
        | "competitor_info"
        | "industry_trends"
        | "company_values"
        | "custom"
      post_status:
        | "draft_input"
        | "hook_gen"
        | "hook_selected"
        | "body_gen"
        | "validated"
        | "scheduled"
        | "published"
      unipile_account_status:
        | "OK"
        | "CREDENTIALS"
        | "DISCONNECTED"
        | "ERROR"
        | "PENDING"
      unipile_provider:
        | "LINKEDIN"
        | "INSTAGRAM"
        | "TWITTER"
        | "WHATSAPP"
        | "MESSENGER"
        | "TELEGRAM"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      author_type: ["internal", "external_influencer"],
      knowledge_type: [
        "product",
        "case_study",
        "testimonial",
        "methodology",
        "statistics",
        "faq",
        "talking_points",
        "competitor_info",
        "industry_trends",
        "company_values",
        "custom",
      ],
      post_status: [
        "draft_input",
        "hook_gen",
        "hook_selected",
        "body_gen",
        "validated",
        "scheduled",
        "published",
      ],
      unipile_account_status: [
        "OK",
        "CREDENTIALS",
        "DISCONNECTED",
        "ERROR",
        "PENDING",
      ],
      unipile_provider: [
        "LINKEDIN",
        "INSTAGRAM",
        "TWITTER",
        "WHATSAPP",
        "MESSENGER",
        "TELEGRAM",
      ],
    },
  },
} as const

// ==================== UTILITY TYPES ====================
export type PostStatus = Database['public']['Enums']['post_status']
export type AuthorType = Database['public']['Enums']['author_type']
export type KnowledgeType = Database['public']['Enums']['knowledge_type']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Platform = Database['public']['Tables']['platforms']['Row']
export type Topic = Database['public']['Tables']['topics']['Row']
export type Audience = Database['public']['Tables']['audiences']['Row']
export type Knowledge = Database['public']['Tables']['knowledge']['Row']
export type ProductionPost = Database['public']['Tables']['production_posts']['Row']
export type HookType = Database['public']['Tables']['hook_types']['Row']
export type GeneratedHook = Database['public']['Tables']['generated_hooks']['Row']
export type Ressource = Database['public']['Tables']['ressources']['Row']
export type ContentSource = Database['public']['Tables']['content_sources']['Row']

// Custom types not from DB
export interface HookDraft {
  id: string
  text: string
  text_draft?: string
  text_final?: string
  score?: number
  style_tags?: string[]
  feedback?: 'approved' | 'rejected' | 'regenerate'
  userComment?: string
}

// Extended ProductionPost with relations
export interface ProductionPostWithRelations extends ProductionPost {
  source?: string | null
  platform?: Platform | null
  author?: Profile | null
  topic?: Topic | null
}
