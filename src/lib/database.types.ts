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
      ai_errors: {
        Row: {
          created_at: string | null
          error_code: string
          error_message: string
          error_stack: string | null
          fallback_model: string | null
          fallback_success: boolean | null
          fallback_used: boolean | null
          function_name: string
          id: string
          input_tokens: number | null
          is_resolved: boolean | null
          latency_ms: number | null
          metadata: Json | null
          output_tokens: number | null
          primary_model: string | null
          profile_id: string | null
          request_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          user_error_ref: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_code: string
          error_message: string
          error_stack?: string | null
          fallback_model?: string | null
          fallback_success?: boolean | null
          fallback_used?: boolean | null
          function_name: string
          id?: string
          input_tokens?: number | null
          is_resolved?: boolean | null
          latency_ms?: number | null
          metadata?: Json | null
          output_tokens?: number | null
          primary_model?: string | null
          profile_id?: string | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_error_ref?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string
          error_message?: string
          error_stack?: string | null
          fallback_model?: string | null
          fallback_success?: boolean | null
          fallback_used?: boolean | null
          function_name?: string
          id?: string
          input_tokens?: number | null
          is_resolved?: boolean | null
          latency_ms?: number | null
          metadata?: Json | null
          output_tokens?: number | null
          primary_model?: string | null
          profile_id?: string | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_error_ref?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_errors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          label_fr: string | null
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
          label_fr?: string | null
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
          label_fr?: string | null
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
      batch_author_configs: {
        Row: {
          author_id: string
          batch_id: string
          created_at: string | null
          id: string
          knowledge_ids: string[] | null
          template_id: string | null
          topic_id: string | null
        }
        Insert: {
          author_id: string
          batch_id: string
          created_at?: string | null
          id?: string
          knowledge_ids?: string[] | null
          template_id?: string | null
          topic_id?: string | null
        }
        Update: {
          author_id?: string
          batch_id?: string
          created_at?: string | null
          id?: string
          knowledge_ids?: string[] | null
          template_id?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_author_configs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_author_configs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "post_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_author_configs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "post_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_author_configs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      company_auto_post_rules: {
        Row: {
          add_prefix: string | null
          add_suffix: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          post_delay_minutes: number | null
          source_profile_id: string
          target_company_page_id: string
          updated_at: string | null
        }
        Insert: {
          add_prefix?: string | null
          add_suffix?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          post_delay_minutes?: number | null
          source_profile_id: string
          target_company_page_id: string
          updated_at?: string | null
        }
        Update: {
          add_prefix?: string | null
          add_suffix?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          post_delay_minutes?: number | null
          source_profile_id?: string
          target_company_page_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_auto_post_rules_source_profile_id_fkey"
            columns: ["source_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_auto_post_rules_target_company_page_id_fkey"
            columns: ["target_company_page_id"]
            isOneToOne: false
            referencedRelation: "company_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pages: {
        Row: {
          admin_unipile_account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_urn: string
          updated_at: string | null
        }
        Insert: {
          admin_unipile_account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_urn: string
          updated_at?: string | null
        }
        Update: {
          admin_unipile_account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_urn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_pages_admin_unipile_account_id_fkey"
            columns: ["admin_unipile_account_id"]
            isOneToOne: false
            referencedRelation: "unipile_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_published_posts: {
        Row: {
          attachments: Json | null
          company_page_id: string
          content: string | null
          created_at: string | null
          error_message: string | null
          external_post_id: string | null
          id: string
          original_post_id: string | null
          original_published_post_id: string | null
          post_url: string | null
          published_at: string | null
          scheduled_for: string | null
          status: string | null
        }
        Insert: {
          attachments?: Json | null
          company_page_id: string
          content?: string | null
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          original_post_id?: string | null
          original_published_post_id?: string | null
          post_url?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
        }
        Update: {
          attachments?: Json | null
          company_page_id?: string
          content?: string | null
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          original_post_id?: string | null
          original_published_post_id?: string | null
          post_url?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_published_posts_company_page_id_fkey"
            columns: ["company_page_id"]
            isOneToOne: false
            referencedRelation: "company_pages"
            referencedColumns: ["id"]
          },
        ]
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
      ctas: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      engagement_logs: {
        Row: {
          comment_error: string | null
          comment_id: string | null
          comment_success: boolean | null
          comment_text: string | null
          created_at: string | null
          delay_ms: number | null
          engager_name: string | null
          engager_profile_id: string | null
          engager_unipile_account_id: string | null
          executed_at: string | null
          external_post_id: string
          id: string
          post_author_id: string | null
          post_content: string | null
          published_post_id: string | null
          reaction_error: string | null
          reaction_success: boolean | null
          reaction_type: string | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          comment_error?: string | null
          comment_id?: string | null
          comment_success?: boolean | null
          comment_text?: string | null
          created_at?: string | null
          delay_ms?: number | null
          engager_name?: string | null
          engager_profile_id?: string | null
          engager_unipile_account_id?: string | null
          executed_at?: string | null
          external_post_id: string
          id?: string
          post_author_id?: string | null
          post_content?: string | null
          published_post_id?: string | null
          reaction_error?: string | null
          reaction_success?: boolean | null
          reaction_type?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          comment_error?: string | null
          comment_id?: string | null
          comment_success?: boolean | null
          comment_text?: string | null
          created_at?: string | null
          delay_ms?: number | null
          engager_name?: string | null
          engager_profile_id?: string | null
          engager_unipile_account_id?: string | null
          executed_at?: string | null
          external_post_id?: string
          id?: string
          post_author_id?: string | null
          post_content?: string | null
          published_post_id?: string | null
          reaction_error?: string | null
          reaction_success?: boolean | null
          reaction_type?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_logs_engager_profile_id_fkey"
            columns: ["engager_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_logs_engager_unipile_account_id_fkey"
            columns: ["engager_unipile_account_id"]
            isOneToOne: false
            referencedRelation: "unipile_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_logs_post_author_id_fkey"
            columns: ["post_author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_logs_published_post_id_fkey"
            columns: ["published_post_id"]
            isOneToOne: false
            referencedRelation: "published_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_settings: {
        Row: {
          auto_comment_enabled: boolean | null
          auto_react_enabled: boolean | null
          comments_today: number | null
          created_at: string | null
          id: string
          last_reset_at: string | null
          max_comments_per_day: number | null
          max_reactions_per_day: number | null
          preferred_reaction: string | null
          profile_id: string
          reactions_today: number | null
          updated_at: string | null
        }
        Insert: {
          auto_comment_enabled?: boolean | null
          auto_react_enabled?: boolean | null
          comments_today?: number | null
          created_at?: string | null
          id?: string
          last_reset_at?: string | null
          max_comments_per_day?: number | null
          max_reactions_per_day?: number | null
          preferred_reaction?: string | null
          profile_id: string
          reactions_today?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_comment_enabled?: boolean | null
          auto_react_enabled?: boolean | null
          comments_today?: number | null
          created_at?: string | null
          id?: string
          last_reset_at?: string | null
          max_comments_per_day?: number | null
          max_reactions_per_day?: number | null
          preferred_reaction?: string | null
          profile_id?: string
          reactions_today?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          topic_id: string | null
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
          topic_id?: string | null
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
          topic_id?: string | null
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
          {
            foreignKeyName: "knowledge_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
          config_status?: string | null
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
          config_status?: string | null
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
      post_batches: {
        Row: {
          completed_at: string | null
          completed_posts: number | null
          created_at: string | null
          id: string
          language: string | null
          mode: Database["public"]["Enums"]["batch_mode"] | null
          source_text: string
          status: string | null
          total_posts: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_posts?: number | null
          created_at?: string | null
          id?: string
          language?: string | null
          mode?: Database["public"]["Enums"]["batch_mode"] | null
          source_text: string
          status?: string | null
          total_posts?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_posts?: number | null
          created_at?: string | null
          id?: string
          language?: string | null
          mode?: Database["public"]["Enums"]["batch_mode"] | null
          source_text?: string
          status?: string | null
          total_posts?: number | null
          updated_at?: string | null
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
      post_templates: {
        Row: {
          best_for: string[] | null
          body_structure: string | null
          color: string | null
          content_format_id: string | null
          created_at: string | null
          created_by: string | null
          cta_style: string | null
          description: string | null
          engagement_score: number | null
          example: string | null
          hook_style: string | null
          icon_name: string | null
          id: string
          is_favorite: boolean | null
          name: string
          objective: string | null
          structure: string
          tips: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          best_for?: string[] | null
          body_structure?: string | null
          color?: string | null
          content_format_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_style?: string | null
          description?: string | null
          engagement_score?: number | null
          example?: string | null
          hook_style?: string | null
          icon_name?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          objective?: string | null
          structure: string
          tips?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          best_for?: string[] | null
          body_structure?: string | null
          color?: string | null
          content_format_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_style?: string | null
          description?: string | null
          engagement_score?: number | null
          example?: string | null
          hook_style?: string | null
          icon_name?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          objective?: string | null
          structure?: string
          tips?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presets: {
        Row: {
          color: string | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          example_post: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          template_structure: string | null
          type: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          color?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example_post?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_structure?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          color?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example_post?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_structure?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
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
          attachments: Json | null
          audience_id: string | null
          author_id: string | null
          batch_id: string | null
          batch_slot_order: number | null
          created_at: string | null
          final_content: string | null
          generated_body_conclusion: string | null
          generated_body_intro: string | null
          generated_body_main: string | null
          id: string
          knowledge_ids: string[] | null
          platform_id: string | null
          publication_date: string | null
          selected_hook_data: Json | null
          source_id: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          target_topic: string | null
          template_id: string | null
          topic_id: string | null
          user_feedback_history: Json | null
        }
        Insert: {
          ai_body_draft?: Json | null
          ai_hooks_draft?: Json | null
          attachments?: Json | null
          audience_id?: string | null
          author_id?: string | null
          batch_id?: string | null
          batch_slot_order?: number | null
          created_at?: string | null
          final_content?: string | null
          generated_body_conclusion?: string | null
          generated_body_intro?: string | null
          generated_body_main?: string | null
          id?: string
          knowledge_ids?: string[] | null
          platform_id?: string | null
          publication_date?: string | null
          selected_hook_data?: Json | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          target_topic?: string | null
          template_id?: string | null
          topic_id?: string | null
          user_feedback_history?: Json | null
        }
        Update: {
          ai_body_draft?: Json | null
          ai_hooks_draft?: Json | null
          attachments?: Json | null
          audience_id?: string | null
          author_id?: string | null
          batch_id?: string | null
          batch_slot_order?: number | null
          created_at?: string | null
          final_content?: string | null
          generated_body_conclusion?: string | null
          generated_body_intro?: string | null
          generated_body_main?: string | null
          id?: string
          knowledge_ids?: string[] | null
          platform_id?: string | null
          publication_date?: string | null
          selected_hook_data?: Json | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          target_topic?: string | null
          template_id?: string | null
          topic_id?: string | null
          user_feedback_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "production_posts_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_posts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "post_batches"
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
            foreignKeyName: "production_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "post_templates"
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
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          invitation_accepted_at: string | null
          invitation_sent_at: string | null
          invitation_status: string | null
          invitation_token: string | null
          last_name: string | null
          last_style_analysis_at: string | null
          last_sync_at: string | null
          linkedin_id: string | null
          posts_count: number | null
          role: string | null
          style_analysis: Json | null
          sync_status: string | null
          type: Database["public"]["Enums"]["author_type"] | null
          writing_style_embedding: string | null
          writing_style_prompt: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_engagement?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          last_name?: string | null
          last_style_analysis_at?: string | null
          last_sync_at?: string | null
          linkedin_id?: string | null
          posts_count?: number | null
          role?: string | null
          style_analysis?: Json | null
          sync_status?: string | null
          type?: Database["public"]["Enums"]["author_type"] | null
          writing_style_embedding?: string | null
          writing_style_prompt?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_engagement?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          last_name?: string | null
          last_style_analysis_at?: string | null
          last_sync_at?: string | null
          linkedin_id?: string | null
          posts_count?: number | null
          role?: string | null
          style_analysis?: Json | null
          sync_status?: string | null
          type?: Database["public"]["Enums"]["author_type"] | null
          writing_style_embedding?: string | null
          writing_style_prompt?: string | null
        }
        Relationships: []
      }
      published_posts: {
        Row: {
          content: string | null
          created_at: string | null
          external_post_id: string | null
          id: string
          post_url: string | null
          profile_id: string | null
          published_at: string | null
          scheduled_post_id: string | null
          unipile_account_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          external_post_id?: string | null
          id?: string
          post_url?: string | null
          profile_id?: string | null
          published_at?: string | null
          scheduled_post_id?: string | null
          unipile_account_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          external_post_id?: string | null
          id?: string
          post_url?: string | null
          profile_id?: string | null
          published_at?: string | null
          scheduled_post_id?: string | null
          unipile_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "published_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_posts_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_posts_unipile_account_id_fkey"
            columns: ["unipile_account_id"]
            isOneToOne: false
            referencedRelation: "unipile_accounts"
            referencedColumns: ["id"]
          },
        ]
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
          mime_type: string | null
          original_filename: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          type_id: string | null
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
          mime_type?: string | null
          original_filename?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          type_id?: string | null
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
          mime_type?: string | null
          original_filename?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          type_id?: string | null
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
      sync_job_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          items_failed: number | null
          items_processed: number | null
          items_total: number | null
          job_type: string
          metadata: Json | null
          profile_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_total?: number | null
          job_type: string
          metadata?: Json | null
          profile_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_total?: number | null
          job_type?: string
          metadata?: Json | null
          profile_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_job_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      template_presets: {
        Row: {
          created_at: string | null
          id: string
          preset_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preset_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preset_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_presets_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_presets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
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
          label_fr: string | null
          name: string
          slug: string | null
          topic_group: string | null
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
          label_fr?: string | null
          name: string
          slug?: string | null
          topic_group?: string | null
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
          label_fr?: string | null
          name?: string
          slug?: string | null
          topic_group?: string | null
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
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          is_completed: boolean | null
          steps_completed: Json | null
          updated_at: string | null
          user_id: string
          user_preferences: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          is_completed?: boolean | null
          steps_completed?: Json | null
          updated_at?: string | null
          user_id: string
          user_preferences?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          is_completed?: boolean | null
          steps_completed?: Json | null
          updated_at?: string | null
          user_id?: string
          user_preferences?: Json | null
        }
        Relationships: []
      }
      viral_posts_bank: {
        Row: {
          audience_id: string | null
          author_id: string | null
          content: string
          content_format_id: string | null
          created_at: string | null
          embedding: string | null
          hook: string | null
          hook_extracted_at: string | null
          hook_type_id: string | null
          id: string
          last_updated_at: string | null
          metrics: Json | null
          needs_audience_classification: boolean | null
          needs_embedding: boolean | null
          needs_hook_classification: boolean | null
          needs_hook_extraction: boolean | null
          needs_topic_classification: boolean | null
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
          content_format_id?: string | null
          created_at?: string | null
          embedding?: string | null
          hook?: string | null
          hook_extracted_at?: string | null
          hook_type_id?: string | null
          id?: string
          last_updated_at?: string | null
          metrics?: Json | null
          needs_audience_classification?: boolean | null
          needs_embedding?: boolean | null
          needs_hook_classification?: boolean | null
          needs_hook_extraction?: boolean | null
          needs_topic_classification?: boolean | null
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
          content_format_id?: string | null
          created_at?: string | null
          embedding?: string | null
          hook?: string | null
          hook_extracted_at?: string | null
          hook_type_id?: string | null
          id?: string
          last_updated_at?: string | null
          metrics?: Json | null
          needs_audience_classification?: boolean | null
          needs_embedding?: boolean | null
          needs_hook_classification?: boolean | null
          needs_hook_extraction?: boolean | null
          needs_topic_classification?: boolean | null
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
      ai_error_stats: {
        Row: {
          avg_latency_ms: number | null
          error_code: string | null
          error_count: number | null
          fallback_count: number | null
          fallback_success_count: number | null
          function_name: string | null
          hour: string | null
        }
        Relationships: []
      }
      processing_status: {
        Row: {
          pending_audiences: number | null
          pending_embeddings: number | null
          pending_hooks: number | null
          pending_topics: number | null
          profiles_completed: number | null
          profiles_in_progress: number | null
          recent_jobs: Json | null
          total_posts: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      call_publish_scheduled: { Args: never; Returns: undefined }
      can_profile_engage: {
        Args: { p_action_type: string; p_profile_id: string }
        Returns: boolean
      }
      create_post_batch: {
        Args: {
          p_language: string
          p_mode: Database["public"]["Enums"]["batch_mode"]
          p_slots: Json
          p_source_text: string
        }
        Returns: string
      }
      generate_error_ref: { Args: never; Returns: string }
      generate_invitation_token: { Args: never; Returns: string }
      get_batch_with_posts: {
        Args: { p_batch_id: string }
        Returns: {
          audience_id: string
          audience_name: string
          author_id: string
          author_name: string
          batch_id: string
          batch_status: string
          hooks_count: number
          language: string
          mode: Database["public"]["Enums"]["batch_mode"]
          post_id: string
          post_status: Database["public"]["Enums"]["post_status"]
          selected_hook_text: string
          slot_order: number
          source_text: string
          template_id: string
          template_name: string
          topic_id: string
          topic_name: string
        }[]
      }
      get_eligible_engagers: {
        Args: { p_external_post_id: string; p_post_author_id: string }
        Returns: {
          preferred_reaction: string
          profile_id: string
          profile_name: string
          unipile_account_external_id: string
          unipile_account_id: string
          writing_style: string
        }[]
      }
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
      get_posts_needing_audience_classification: {
        Args: { max_posts?: number }
        Returns: {
          content: string
          hook: string
          post_id: string
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
      get_posts_needing_topic_classification: {
        Args: { max_posts?: number }
        Returns: {
          content: string
          hook: string
          post_id: string
        }[]
      }
      get_processing_status: {
        Args: never
        Returns: {
          pending_audiences: number
          pending_embeddings: number
          pending_hooks: number
          pending_topics: number
          profiles_completed: number
          profiles_in_progress: number
          total_posts: number
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
      increment_engagement_counter: {
        Args: { p_action_type: string; p_profile_id: string }
        Returns: undefined
      }
      match_audiences: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          description: string
          id: string
          name: string
          pain_points: string[]
          similarity: number
        }[]
      }
      match_hook_types: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          examples: string[]
          formula: string
          id: string
          name: string
          similarity: number
        }[]
      }
      match_topics: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          description: string
          id: string
          name: string
          similarity: number
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
      match_viral_posts_by_author: {
        Args: {
          author_uuid: string
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
      match_viral_posts_by_topic: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          topic_uuid: string
        }
        Returns: {
          content: string
          hook: string
          id: string
          metrics: Json
          similarity: number
        }[]
      }
      match_viral_posts_filtered: {
        Args: {
          author_uuid?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
          topic_uuid?: string
        }
        Returns: {
          content: string
          hook: string
          id: string
          metrics: Json
          similarity: number
        }[]
      }
      trigger_continue_processing: { Args: never; Returns: undefined }
      trigger_profile_sync: { Args: never; Returns: undefined }
      update_batch_progress: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      update_profile_stats: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
    }
    Enums: {
      author_type: "internal" | "external_influencer"
      batch_mode: "single" | "multi"
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
        | "pending"
        | "hooks_generating"
        | "body_generating"
        | "ready"
      topic_group:
        | "sales_prospection"
        | "sales_operations"
        | "business"
        | "mindset_career"
        | "marketing_growth"
        | "ai_tech"
        | "automation_tools"
        | "data_tools"
        | "content_branding"
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
      batch_mode: ["single", "multi"],
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
        "pending",
        "hooks_generating",
        "body_generating",
        "ready",
      ],
      topic_group: [
        "sales_prospection",
        "sales_operations",
        "business",
        "mindset_career",
        "marketing_growth",
        "ai_tech",
        "automation_tools",
        "data_tools",
        "content_branding",
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

// ==================== CUSTOM APPLICATION TYPES ====================
// These types are used throughout the application for type safety

export type BatchMode = 'single' | 'multi'

export type BatchStatus = 
  | 'draft' 
  | 'generating_hooks' 
  | 'hooks_ready' 
  | 'generating_bodies' 
  | 'bodies_ready' 
  | 'publishing' 
  | 'completed' 
  | 'failed'

export type PostStatus = 
  | 'pending'
  | 'draft_input' 
  | 'hook_gen' 
  | 'hook_selected' 
  | 'body_gen' 
  | 'validated' 
  | 'scheduled' 
  | 'published'
  | 'hooks_generating'
  | 'body_generating'
  | 'ready'

export type HookType = 'question' | 'statistic' | 'story' | 'controversial' | 'how_to' | 'custom'

export interface PostBatch {
  id: string
  mode: BatchMode
  status: BatchStatus
  source_text: string | null
  created_at: string
  completed_at: string | null
  profile_id: string | null
}

export interface BatchAuthorConfig {
  id: string
  batch_id: string
  author_id: string
  topic_ids: string[]
  audience_ids: string[]
  template_id: string | null
  preset_id: string | null
  knowledge_ids: string[]
}

export interface GeneratedHook {
  id: string
  text: string
  type: HookType
  score?: number
}

export interface ProductionPost {
  id: string
  batch_id: string | null
  author_id: string | null
  topic_id: string | null
  audience_id: string | null
  template_id: string | null
  status: PostStatus
  target_topic: string | null
  selected_hook_data: { hook?: string; type?: string } | null
  ai_body_draft: { intro?: string; body?: string; conclusion?: string; content?: string } | null
  final_content: string | null
  publication_date: string | null
  created_at: string
  updated_at: string | null
}

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
  linkedin_id: string | null
  type: 'internal' | 'external' | null
  sync_status: string | null
  language: string | null
  writing_style_prompt: string | null
}

export interface Topic {
  id: string
  name: string
  description: string | null
  color: string | null
  topic_group: string | null
}

export interface Audience {
  id: string
  name: string
  label_fr: string | null
  description: string | null
  platform_id: string | null
}

export interface PostTemplate {
  id: string
  name: string
  description: string | null
  structure: string | null
  format_type: string | null
}

export interface Knowledge {
  id: string
  title: string
  content: string | null
  knowledge_type: string | null
}

