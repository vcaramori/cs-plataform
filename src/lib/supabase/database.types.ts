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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_indicator_history: {
        Row: {
          created_at: string | null
          date: string
          id: string
          indicator_id: string
          notes: string | null
          source_type: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          indicator_id: string
          notes?: string | null
          source_type?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          indicator_id?: string
          notes?: string | null
          source_type?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "account_indicator_history_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "account_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      account_indicators: {
        Row: {
          account_id: string
          color: string | null
          created_at: string | null
          current_value: number | null
          icon: string | null
          id: string
          name: string
          target_value: number
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          color?: string | null
          created_at?: string | null
          current_value?: number | null
          icon?: string | null
          id?: string
          name: string
          target_value: number
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          color?: string | null
          created_at?: string | null
          current_value?: number | null
          icon?: string | null
          id?: string
          name?: string
          target_value?: number
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_indicators_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_plans: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          plan_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      account_risk_assessments: {
        Row: {
          account_id: string
          ai_reasoning: string | null
          analyzed_at: string
          created_at: string
          id: string
          risk_score: number
          sentiment_label: string
        }
        Insert: {
          account_id: string
          ai_reasoning?: string | null
          analyzed_at?: string
          created_at?: string
          id?: string
          risk_score: number
          sentiment_label: string
        }
        Update: {
          account_id?: string
          ai_reasoning?: string | null
          analyzed_at?: string
          created_at?: string
          id?: string
          risk_score?: number
          sentiment_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_risk_assessments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_risks: {
        Row: {
          account_id: string
          action_plan: string | null
          created_at: string
          description: string
          id: string
          identified_by: string
          risk_type: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          action_plan?: string | null
          created_at?: string
          description: string
          id?: string
          identified_by: string
          risk_type: string
          severity: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          action_plan?: string | null
          created_at?: string
          description?: string
          id?: string
          identified_by?: string
          risk_type?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_risks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_risks_identified_by_fkey"
            columns: ["identified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_status: string | null
          address: string | null
          billing_contact_email: string | null
          billing_contact_name: string | null
          billing_contact_phone: string | null
          billing_day: number | null
          billing_rules: string | null
          cep: string | null
          city: string | null
          client_id: string | null
          company_name: string | null
          complement: string | null
          created_at: string
          csm_owner_id: string
          discrepancy_alert: boolean | null
          health_breakdown: Json | null
          health_classified_at: string | null
          health_score: number
          health_score_v2: number | null
          health_status: string | null
          health_trend: string
          id: string
          industry: string | null
          is_international: boolean | null
          journey_stage: string | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          number: string | null
          opt_out_auto_checkin: boolean | null
          sales_executive_id: string | null
          segment: string | null
          state: string | null
          street: string | null
          tax_id: string | null
          touch_model: string | null
          website: string | null
        }
        Insert: {
          account_status?: string | null
          address?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_contact_phone?: string | null
          billing_day?: number | null
          billing_rules?: string | null
          cep?: string | null
          city?: string | null
          client_id?: string | null
          company_name?: string | null
          complement?: string | null
          created_at?: string
          csm_owner_id: string
          discrepancy_alert?: boolean | null
          health_breakdown?: Json | null
          health_classified_at?: string | null
          health_score?: number
          health_score_v2?: number | null
          health_status?: string | null
          health_trend?: string
          id?: string
          industry?: string | null
          is_international?: boolean | null
          journey_stage?: string | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          number?: string | null
          opt_out_auto_checkin?: boolean | null
          sales_executive_id?: string | null
          segment?: string | null
          state?: string | null
          street?: string | null
          tax_id?: string | null
          touch_model?: string | null
          website?: string | null
        }
        Update: {
          account_status?: string | null
          address?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_contact_phone?: string | null
          billing_day?: number | null
          billing_rules?: string | null
          cep?: string | null
          city?: string | null
          client_id?: string | null
          company_name?: string | null
          complement?: string | null
          created_at?: string
          csm_owner_id?: string
          discrepancy_alert?: boolean | null
          health_breakdown?: Json | null
          health_classified_at?: string | null
          health_score?: number
          health_score_v2?: number | null
          health_status?: string | null
          health_trend?: string
          id?: string
          industry?: string | null
          is_international?: boolean | null
          journey_stage?: string | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          opt_out_auto_checkin?: boolean | null
          sales_executive_id?: string | null
          segment?: string | null
          state?: string | null
          street?: string | null
          tax_id?: string | null
          touch_model?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_metrics: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          measured_at: string
          metric_name: string
          value: number
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          measured_at?: string
          metric_name: string
          value: number
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          measured_at?: string
          metric_name?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "adoption_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_skills: {
        Row: {
          applies_to: string[]
          body: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          when_to_use: string | null
        }
        Insert: {
          applies_to?: string[]
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          when_to_use?: string | null
        }
        Update: {
          applies_to?: string[]
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          when_to_use?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          changed_by: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_assign_stats: {
        Row: {
          assigned_at: string | null
          assigned_ticket_id: string
          assigned_to_csm_id: string
          capacity_after: number
          capacity_before: number
          created_at: string | null
          id: string
          previous_assigned_to: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_ticket_id: string
          assigned_to_csm_id: string
          capacity_after: number
          capacity_before: number
          created_at?: string | null
          id?: string
          previous_assigned_to?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_ticket_id?: string
          assigned_to_csm_id?: string
          capacity_after?: number
          capacity_before?: number
          created_at?: string | null
          id?: string
          previous_assigned_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_assign_stats_assigned_ticket_id_fkey"
            columns: ["assigned_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_assign_stats_assigned_ticket_id_fkey"
            columns: ["assigned_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_assign_stats_assigned_ticket_id_fkey"
            columns: ["assigned_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_checkin_queue: {
        Row: {
          account_id: string
          approval_deadline: string
          approved_at: string | null
          created_at: string | null
          csm_id: string
          edited_body: string | null
          edited_subject: string | null
          generated_body: string
          generated_subject: string
          id: string
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          approval_deadline: string
          approved_at?: string | null
          created_at?: string | null
          csm_id: string
          edited_body?: string | null
          edited_subject?: string | null
          generated_body: string
          generated_subject: string
          id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          approval_deadline?: string
          approved_at?: string | null
          created_at?: string | null
          csm_id?: string
          edited_body?: string | null
          edited_subject?: string | null
          generated_body?: string
          generated_subject?: string
          id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_checkin_queue_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          account_id: string | null
          created_at: string
          dow: number
          end_time: string
          id: string
          is_active: boolean
          scope: string
          start_time: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          dow: number
          end_time: string
          id?: string
          is_active?: boolean
          scope: string
          start_time: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          dow?: number
          end_time?: string
          id?: string
          is_active?: boolean
          scope?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_suggestions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          auto_applied: boolean | null
          confidence: number
          created_at: string | null
          id: string
          reasoning: string | null
          status: string | null
          suggested_category: string
          ticket_id: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          auto_applied?: boolean | null
          confidence: number
          created_at?: string | null
          id?: string
          reasoning?: string | null
          status?: string | null
          suggested_category: string
          ticket_id: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          auto_applied?: boolean | null
          confidence?: number
          created_at?: string | null
          id?: string
          reasoning?: string | null
          status?: string | null
          suggested_category?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      commercial_governance: {
        Row: {
          account_id: string
          config: Json | null
          contract_id: string | null
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          label: string
          rule_type: string
          starts_at: string | null
          sub_type: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          account_id: string
          config?: Json | null
          contract_id?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          rule_type: string
          starts_at?: string | null
          sub_type: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          account_id?: string
          config?: Json | null
          contract_id?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          rule_type?: string
          starts_at?: string | null
          sub_type?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_governance_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_governance_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string
          decision_maker: boolean
          departed_at: string | null
          departure_reason: string | null
          email: string | null
          id: string
          influence_level: string
          last_interaction_date: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          role: string
          seniority: string
        }
        Insert: {
          account_id: string
          decision_maker?: boolean
          departed_at?: string | null
          departure_reason?: string | null
          email?: string | null
          id?: string
          influence_level: string
          last_interaction_date?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          role: string
          seniority: string
        }
        Update: {
          account_id?: string
          decision_maker?: boolean
          departed_at?: string | null
          departure_reason?: string | null
          email?: string | null
          id?: string
          influence_level?: string
          last_interaction_date?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          role?: string
          seniority?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_history: {
        Row: {
          account_id: string | null
          arr: number | null
          contract_id: string | null
          contract_type: string | null
          contracted_hours_monthly: number | null
          created_at: string | null
          csm_hour_cost: number | null
          description: string | null
          end_date: string | null
          id: string
          mrr: number | null
          notes: string | null
          renewal_date: string | null
          service_type: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          account_id?: string | null
          arr?: number | null
          contract_id?: string | null
          contract_type?: string | null
          contracted_hours_monthly?: number | null
          created_at?: string | null
          csm_hour_cost?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          mrr?: number | null
          notes?: string | null
          renewal_date?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          account_id?: string | null
          arr?: number | null
          contract_id?: string | null
          contract_type?: string | null
          contracted_hours_monthly?: number | null
          created_at?: string | null
          csm_hour_cost?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          mrr?: number | null
          notes?: string | null
          renewal_date?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_plans: {
        Row: {
          contract_id: string
          plan_id: string
        }
        Insert: {
          contract_id: string
          plan_id: string
        }
        Update: {
          contract_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_plans_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_products: {
        Row: {
          contract_id: string
          product_id: string
        }
        Insert: {
          contract_id: string
          product_id: string
        }
        Update: {
          contract_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_products_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_id: string
          arr: number | null
          contract_code: string | null
          contract_type: string | null
          contracted_hours_monthly: number | null
          csm_hour_cost: number | null
          description: string | null
          discount_duration_months: number | null
          discount_fixed_amount: number | null
          discount_percentage: number | null
          discount_type: string | null
          fidelity_months: number | null
          fine_amount: number | null
          id: string
          instance_url: string | null
          mrr: number
          notes: string | null
          pricing_explanation: string | null
          pricing_type: string | null
          progressive_discounts: Json | null
          renewal_date: string | null
          service_type: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          account_id: string
          arr?: number | null
          contract_code?: string | null
          contract_type?: string | null
          contracted_hours_monthly?: number | null
          csm_hour_cost?: number | null
          description?: string | null
          discount_duration_months?: number | null
          discount_fixed_amount?: number | null
          discount_percentage?: number | null
          discount_type?: string | null
          fidelity_months?: number | null
          fine_amount?: number | null
          id?: string
          instance_url?: string | null
          mrr: number
          notes?: string | null
          pricing_explanation?: string | null
          pricing_type?: string | null
          progressive_discounts?: Json | null
          renewal_date?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          account_id?: string
          arr?: number | null
          contract_code?: string | null
          contract_type?: string | null
          contracted_hours_monthly?: number | null
          csm_hour_cost?: number | null
          description?: string | null
          discount_duration_months?: number | null
          discount_fixed_amount?: number | null
          discount_percentage?: number | null
          discount_type?: string | null
          fidelity_months?: number | null
          fine_amount?: number | null
          id?: string
          instance_url?: string | null
          mrr?: number
          notes?: string | null
          pricing_explanation?: string | null
          pricing_type?: string | null
          progressive_discounts?: Json | null
          renewal_date?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_responses: {
        Row: {
          account_id: string
          answered_at: string
          comment: string | null
          id: string
          respondent_email: string
          score: number
          ticket_id: string
        }
        Insert: {
          account_id: string
          answered_at?: string
          comment?: string | null
          id?: string
          respondent_email: string
          score: number
          ticket_id: string
        }
        Update: {
          account_id?: string
          answered_at?: string
          comment?: string | null
          id?: string
          respondent_email?: string
          score?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_responses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_tokens: {
        Row: {
          created_at: string
          email_delivery_failed: boolean
          expires_at: string
          id: string
          ticket_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email_delivery_failed?: boolean
          expires_at: string
          id?: string
          ticket_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email_delivery_failed?: boolean
          expires_at?: string
          id?: string
          ticket_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csat_tokens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_tokens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_tokens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_queue_config: {
        Row: {
          id: string
          is_available: boolean | null
          max_concurrent_tickets: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_available?: boolean | null
          max_concurrent_tickets?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_available?: boolean | null
          max_concurrent_tickets?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      csm_settings: {
        Row: {
          auto_assign_enabled: boolean | null
          created_at: string | null
          max_tickets_capacity: number | null
          user_id: string
        }
        Insert: {
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          max_tickets_capacity?: number | null
          user_id: string
        }
        Update: {
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          max_tickets_capacity?: number | null
          user_id?: string
        }
        Relationships: []
      }
      csm_task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csm_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "csm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csm_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "csm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_tasks: {
        Row: {
          account_id: string | null
          activity_type: string | null
          adoption_id: string | null
          alert_id: string | null
          completed_at: string | null
          created_at: string
          csm_id: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          source_label: string | null
          status: string
          time_entry_id: string | null
          title: string
          updated_at: string
          workflow_run_step_id: string | null
        }
        Insert: {
          account_id?: string | null
          activity_type?: string | null
          adoption_id?: string | null
          alert_id?: string | null
          completed_at?: string | null
          created_at?: string
          csm_id: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          source_label?: string | null
          status?: string
          time_entry_id?: string | null
          title: string
          updated_at?: string
          workflow_run_step_id?: string | null
        }
        Update: {
          account_id?: string | null
          activity_type?: string | null
          adoption_id?: string | null
          alert_id?: string | null
          completed_at?: string | null
          created_at?: string
          csm_id?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          source_label?: string | null
          status?: string
          time_entry_id?: string | null
          title?: string
          updated_at?: string
          workflow_run_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csm_tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_tasks_adoption_id_fkey"
            columns: ["adoption_id"]
            isOneToOne: false
            referencedRelation: "feature_adoption"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_tasks_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "proactive_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_tasks_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_tasks_workflow_run_step_id_fkey"
            columns: ["workflow_run_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_run_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          account_id: string
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string | null
          id: string
          source_id: string
          source_type: string
        }
        Insert: {
          account_id: string
          chunk_index?: number
          chunk_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          source_id: string
          source_type: string
        }
        Update: {
          account_id?: string
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_adoption: {
        Row: {
          account_id: string | null
          action_owner: string | null
          action_plan: string | null
          action_status: string | null
          blocker_category: string | null
          blocker_reason: string | null
          feature_id: string | null
          id: string
          observation: string | null
          priority_level: string | null
          product_id: string | null
          responsible_id: string | null
          reviewed_at: string | null
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          action_owner?: string | null
          action_plan?: string | null
          action_status?: string | null
          blocker_category?: string | null
          blocker_reason?: string | null
          feature_id?: string | null
          id?: string
          observation?: string | null
          priority_level?: string | null
          product_id?: string | null
          responsible_id?: string | null
          reviewed_at?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          action_owner?: string | null
          action_plan?: string | null
          action_status?: string | null
          blocker_category?: string | null
          blocker_reason?: string | null
          feature_id?: string | null
          id?: string
          observation?: string | null
          priority_level?: string | null
          product_id?: string | null
          responsible_id?: string | null
          reviewed_at?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_adoption_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_adoption_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "product_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_adoption_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_epics: {
        Row: {
          created_at: string
          epic_id: string
          feature_id: string
          id: string
        }
        Insert: {
          created_at?: string
          epic_id: string
          feature_id: string
          id?: string
        }
        Update: {
          created_at?: string
          epic_id?: string
          feature_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_epics_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "product_epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_epics_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "product_features"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          account_id: string
          classification: string | null
          created_at: string | null
          created_by: string | null
          discrepancy: number | null
          discrepancy_alert: boolean
          engagement_component: number | null
          evaluated_at: string
          id: string
          manual_notes: string | null
          manual_ranking: string | null
          manual_score: number | null
          sentiment_component: number | null
          shadow_reasoning: string | null
          shadow_score: number | null
          source_type: string | null
          ticket_component: number | null
        }
        Insert: {
          account_id: string
          classification?: string | null
          created_at?: string | null
          created_by?: string | null
          discrepancy?: number | null
          discrepancy_alert?: boolean
          engagement_component?: number | null
          evaluated_at?: string
          id?: string
          manual_notes?: string | null
          manual_ranking?: string | null
          manual_score?: number | null
          sentiment_component?: number | null
          shadow_reasoning?: string | null
          shadow_score?: number | null
          source_type?: string | null
          ticket_component?: number | null
        }
        Update: {
          account_id?: string
          classification?: string | null
          created_at?: string | null
          created_by?: string | null
          discrepancy?: number | null
          discrepancy_alert?: boolean
          engagement_component?: number | null
          evaluated_at?: string
          id?: string
          manual_notes?: string | null
          manual_ranking?: string | null
          manual_score?: number | null
          sentiment_component?: number | null
          shadow_reasoning?: string | null
          shadow_score?: number | null
          source_type?: string | null
          ticket_component?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          account_id: string
          alert_triggered: boolean
          contract_id: string | null
          created_at: string
          csm_id: string
          date: string
          direct_hours: number
          file_urls: Json | null
          id: string
          pinecone_vector_id: string | null
          raw_transcript: string | null
          sentiment_score: number | null
          source: string
          time_entry_id: string | null
          title: string
          type: string
        }
        Insert: {
          account_id: string
          alert_triggered?: boolean
          contract_id?: string | null
          created_at?: string
          csm_id: string
          date: string
          direct_hours?: number
          file_urls?: Json | null
          id?: string
          pinecone_vector_id?: string | null
          raw_transcript?: string | null
          sentiment_score?: number | null
          source?: string
          time_entry_id?: string | null
          title: string
          type: string
        }
        Update: {
          account_id?: string
          alert_triggered?: boolean
          contract_id?: string | null
          created_at?: string
          csm_id?: string
          date?: string
          direct_hours?: number
          file_urls?: Json | null
          id?: string
          pinecone_vector_id?: string | null
          raw_transcript?: string | null
          sentiment_score?: number | null
          source?: string
          time_entry_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nps_answers: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          response_id: string
          selected_options: string[] | null
          text_value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          response_id: string
          selected_options?: string[] | null
          text_value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          response_id?: string
          selected_options?: string[] | null
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "nps_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "nps_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_global_goals: {
        Row: {
          created_at: string | null
          end_date: string | null
          goal_score: number
          id: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          goal_score: number
          id?: string
          start_date?: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          goal_score?: number
          id?: string
          start_date?: string
        }
        Relationships: []
      }
      nps_programs: {
        Row: {
          account_id: string | null
          account_recurrence_days: number
          active_from: string | null
          active_until: string | null
          created_at: string | null
          csm_owner_id: string | null
          dismiss_days: number
          id: string
          is_active: boolean | null
          is_default: boolean
          is_test_mode: boolean | null
          name: string | null
          open_question: string
          program_key: string
          question: string
          recurrence_days: number
          tags: string[] | null
          target_score: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          account_recurrence_days?: number
          active_from?: string | null
          active_until?: string | null
          created_at?: string | null
          csm_owner_id?: string | null
          dismiss_days?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          is_test_mode?: boolean | null
          name?: string | null
          open_question?: string
          program_key?: string
          question?: string
          recurrence_days?: number
          tags?: string[] | null
          target_score?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          account_recurrence_days?: number
          active_from?: string | null
          active_until?: string | null
          created_at?: string | null
          csm_owner_id?: string | null
          dismiss_days?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          is_test_mode?: boolean | null
          name?: string | null
          open_question?: string
          program_key?: string
          question?: string
          recurrence_days?: number
          tags?: string[] | null
          target_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_programs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          order_index: number
          program_id: string
          required: boolean | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          program_id: string
          required?: boolean | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          program_id?: string
          required?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_questions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "nps_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          account_id: string | null
          comment: string | null
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          is_test: boolean
          program_key: string
          responded_at: string | null
          score: number | null
          tags: string[] | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          comment?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          is_test?: boolean
          program_key: string
          responded_at?: string | null
          score?: number | null
          tags?: string[] | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          comment?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          is_test?: boolean
          program_key?: string
          responded_at?: string | null
          score?: number | null
          tags?: string[] | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          feature_id: string | null
          id: string
          is_default: boolean | null
          is_included_in_plan: boolean | null
          plan_id: string | null
        }
        Insert: {
          feature_id?: string | null
          id?: string
          is_default?: boolean | null
          is_included_in_plan?: boolean | null
          plan_id?: string | null
        }
        Update: {
          feature_id?: string | null
          id?: string
          is_default?: boolean | null
          is_included_in_plan?: boolean | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "product_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invites: {
        Row: {
          account_id: string
          contact_id: string
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          notes: string | null
          responded_at: string | null
          status: string
          token: string | null
        }
        Insert: {
          account_id: string
          contact_id: string
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          notes?: string | null
          responded_at?: string | null
          status?: string
          token?: string | null
        }
        Update: {
          account_id?: string
          contact_id?: string
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          notes?: string | null
          responded_at?: string | null
          status?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_invites_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proactive_alerts: {
        Row: {
          account_id: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proactive_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_epics: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_epics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_features: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          module: string | null
          name: string
          requires_integration: boolean | null
          requires_training: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          name: string
          requires_integration?: boolean | null
          requires_training?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          name?: string
          requires_integration?: boolean | null
          requires_training?: boolean | null
        }
        Relationships: []
      }
      products: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          key: string | null
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          contact_id: string | null
          created_at: string | null
          custom_role_id: string | null
          full_name: string | null
          id: string
          is_active: boolean
          portal_approved_at: string | null
          portal_approved_by: string | null
          role: string | null
          updated_at: string | null
          user_type: string
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          contact_id?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          portal_approved_at?: string | null
          portal_approved_by?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: string
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          contact_id?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          portal_approved_at?: string | null
          portal_approved_by?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_portal_approved_by_fkey"
            columns: ["portal_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_sentiments: {
        Row: {
          analyzed_at: string | null
          confidence: number
          created_at: string | null
          id: string
          keywords: string[] | null
          reply_id: string
          score: number
          sentiment: string
          ticket_id: string
        }
        Insert: {
          analyzed_at?: string | null
          confidence?: number
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          reply_id: string
          score: number
          sentiment: string
          ticket_id: string
        }
        Update: {
          analyzed_at?: string | null
          confidence?: number
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          reply_id?: string
          score?: number
          sentiment?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_sentiments_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: true
            referencedRelation: "support_ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_sentiments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_sentiments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_sentiments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_suggestion_cache: {
        Row: {
          cached_at: string | null
          expires_at: string | null
          id: string
          suggestion_id: string
          ticket_id: string
        }
        Insert: {
          cached_at?: string | null
          expires_at?: string | null
          id?: string
          suggestion_id: string
          ticket_id: string
        }
        Update: {
          cached_at?: string | null
          expires_at?: string | null
          id?: string
          suggestion_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_suggestion_cache_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "reply_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestion_cache_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestion_cache_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestion_cache_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_suggestion_telemetry: {
        Row: {
          action: string
          action_at: string | null
          created_at: string | null
          edit_distance: number | null
          id: string
          suggestion_id: string
          ticket_id: string
        }
        Insert: {
          action: string
          action_at?: string | null
          created_at?: string | null
          edit_distance?: number | null
          id?: string
          suggestion_id: string
          ticket_id: string
        }
        Update: {
          action?: string
          action_at?: string | null
          created_at?: string | null
          edit_distance?: number | null
          id?: string
          suggestion_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_suggestion_telemetry_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "reply_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestion_telemetry_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestion_telemetry_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestion_telemetry_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_suggestions: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          confidence: number | null
          created_at: string | null
          generated_at: string | null
          id: string
          model_used: string | null
          rejected_at: string | null
          rejected_by: string | null
          sources: string[] | null
          suggestion_text: string
          ticket_id: string
          used_in_reply: boolean | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          confidence?: number | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          model_used?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          sources?: string[] | null
          suggestion_text: string
          ticket_id: string
          used_in_reply?: boolean | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          confidence?: number | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          model_used?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          sources?: string[] | null
          suggestion_text?: string
          ticket_id?: string
          used_in_reply?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reply_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          account_id: string | null
          created_at: string | null
          entity_type: string | null
          filters: Json
          icon: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          entity_type?: string | null
          filters: Json
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          entity_type?: string | null
          filters?: Json
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_escalation_metrics: {
        Row: {
          created_at: string | null
          escalation_count: number | null
          escalation_date: string | null
          id: string
          sla_status: string
          total_escalations: number | null
        }
        Insert: {
          created_at?: string | null
          escalation_count?: number | null
          escalation_date?: string | null
          id?: string
          sla_status: string
          total_escalations?: number | null
        }
        Update: {
          created_at?: string | null
          escalation_count?: number | null
          escalation_date?: string | null
          id?: string
          sla_status?: string
          total_escalations?: number | null
        }
        Relationships: []
      }
      sla_escalations: {
        Row: {
          created_at: string | null
          escalated_at: string | null
          escalation_count: number | null
          id: string
          last_escalated_at: string | null
          sla_status: string
          slack_channel: string | null
          slack_message_ts: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          escalated_at?: string | null
          escalation_count?: number | null
          id?: string
          last_escalated_at?: string | null
          sla_status: string
          slack_channel?: string | null
          slack_message_ts?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          escalated_at?: string | null
          escalation_count?: number | null
          id?: string
          last_escalated_at?: string | null
          sla_status?: string
          slack_channel?: string | null
          slack_message_ts?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_escalations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_escalations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_escalations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_events: {
        Row: {
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string
          ticket_id: string
        }
        Insert: {
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          ticket_id: string
        }
        Update: {
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_level_mappings: {
        Row: {
          created_at: string
          external_label: string
          id: string
          internal_level: string
          policy_id: string
        }
        Insert: {
          created_at?: string
          external_label: string
          id?: string
          internal_level: string
          policy_id: string
        }
        Update: {
          created_at?: string
          external_label?: string
          id?: string
          internal_level?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_level_mappings_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          account_id: string | null
          alert_threshold_pct: number
          auto_close_hours: number
          contract_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_global: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          alert_threshold_pct?: number
          auto_close_hours?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          alert_threshold_pct?: number
          auto_close_hours?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_policies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policy_levels: {
        Row: {
          created_at: string
          first_response_minutes: number
          id: string
          level: string
          policy_id: string
          resolution_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_response_minutes: number
          id?: string
          level: string
          policy_id: string
          resolution_minutes: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_response_minutes?: number
          id?: string
          level?: string
          policy_id?: string
          resolution_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policy_levels_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product_id: string | null
          tier_rank: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_id?: string | null
          tier_rank?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_id?: string | null
          tier_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      success_goals: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          status: string
          target_date: string | null
          title: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          status: string
          target_date?: string | null
          title: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          status?: string
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      success_plan_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          plan_id: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          plan_id: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          plan_id?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_plan_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "success_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      success_plans: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          shared_token: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          shared_token?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          shared_token?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_schedules: {
        Row: {
          completed: boolean
          created_at: string
          created_by: string | null
          id: string
          notified: boolean
          reason: string | null
          target_time: string
          ticket_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          notified?: boolean
          reason?: string | null
          target_time: string
          ticket_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          notified?: boolean
          reason?: string | null
          target_time?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_schedules_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_schedules_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_schedules_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          author_email: string | null
          author_id: string
          body: string
          created_at: string
          id: string
          metadata: Json | null
          ticket_id: string
          type: string
        }
        Insert: {
          author_email?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          metadata?: Json | null
          ticket_id: string
          type: string
        }
        Update: {
          author_email?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          account_id: string
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          contract_id: string | null
          created_at: string
          csv_filename: string | null
          description: string
          external_priority_label: string | null
          external_ticket_id: string | null
          first_assigned_to: string | null
          first_response_at: string | null
          first_response_attention_at: string | null
          first_response_deadline: string | null
          id: string
          internal_level: string | null
          is_vectorized: boolean | null
          merge_count: number | null
          merged_at: string | null
          merged_into: string | null
          opened_at: string
          parent_ticket_id: string | null
          pending_reason: string | null
          pinecone_vector_id: string | null
          priority: string
          product: string | null
          requester_email: string | null
          resolution_attention_at: string | null
          resolution_deadline: string | null
          resolved_at: string | null
          sentiment_trend_cache: Json | null
          sentiment_trend_cache_generated_at: string | null
          sla_breach_first_response: boolean
          sla_breach_resolution: boolean
          sla_policy_id: string | null
          sla_status_first_response: string | null
          sla_status_resolution: string | null
          source: string
          status: string
          suggested_category: string | null
          suggestion_confidence: number | null
          suggestion_reasoning: string | null
          summary: string | null
          summary_generated_at: string | null
          thread_content: string | null
          title: string
          urgency_reasoning: Json | null
          urgency_score: Database["public"]["Enums"]["urgency_level"] | null
          urgency_scored_at: string | null
        }
        Insert: {
          account_id: string
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          csv_filename?: string | null
          description: string
          external_priority_label?: string | null
          external_ticket_id?: string | null
          first_assigned_to?: string | null
          first_response_at?: string | null
          first_response_attention_at?: string | null
          first_response_deadline?: string | null
          id?: string
          internal_level?: string | null
          is_vectorized?: boolean | null
          merge_count?: number | null
          merged_at?: string | null
          merged_into?: string | null
          opened_at: string
          parent_ticket_id?: string | null
          pending_reason?: string | null
          pinecone_vector_id?: string | null
          priority?: string
          product?: string | null
          requester_email?: string | null
          resolution_attention_at?: string | null
          resolution_deadline?: string | null
          resolved_at?: string | null
          sentiment_trend_cache?: Json | null
          sentiment_trend_cache_generated_at?: string | null
          sla_breach_first_response?: boolean
          sla_breach_resolution?: boolean
          sla_policy_id?: string | null
          sla_status_first_response?: string | null
          sla_status_resolution?: string | null
          source?: string
          status?: string
          suggested_category?: string | null
          suggestion_confidence?: number | null
          suggestion_reasoning?: string | null
          summary?: string | null
          summary_generated_at?: string | null
          thread_content?: string | null
          title: string
          urgency_reasoning?: Json | null
          urgency_score?: Database["public"]["Enums"]["urgency_level"] | null
          urgency_scored_at?: string | null
        }
        Update: {
          account_id?: string
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          csv_filename?: string | null
          description?: string
          external_priority_label?: string | null
          external_ticket_id?: string | null
          first_assigned_to?: string | null
          first_response_at?: string | null
          first_response_attention_at?: string | null
          first_response_deadline?: string | null
          id?: string
          internal_level?: string | null
          is_vectorized?: boolean | null
          merge_count?: number | null
          merged_at?: string | null
          merged_into?: string | null
          opened_at?: string
          parent_ticket_id?: string | null
          pending_reason?: string | null
          pinecone_vector_id?: string | null
          priority?: string
          product?: string | null
          requester_email?: string | null
          resolution_attention_at?: string | null
          resolution_deadline?: string | null
          resolved_at?: string | null
          sentiment_trend_cache?: Json | null
          sentiment_trend_cache_generated_at?: string | null
          sla_breach_first_response?: boolean
          sla_breach_resolution?: boolean
          sla_policy_id?: string | null
          sla_status_first_response?: string | null
          sla_status_resolution?: string | null
          source?: string
          status?: string
          suggested_category?: string | null
          suggestion_confidence?: number | null
          suggestion_reasoning?: string | null
          summary?: string | null
          summary_generated_at?: string | null
          thread_content?: string | null
          title?: string
          urgency_reasoning?: Json | null
          urgency_score?: Database["public"]["Enums"]["urgency_level"] | null
          urgency_scored_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          ticket_id: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          ticket_id: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          ticket_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_merge_history: {
        Row: {
          account_id: string | null
          id: string
          merged_at: string | null
          merged_by: string
          primary_ticket_id: string
          reason: string | null
          secondary_ticket_id: string
        }
        Insert: {
          account_id?: string | null
          id?: string
          merged_at?: string | null
          merged_by: string
          primary_ticket_id: string
          reason?: string | null
          secondary_ticket_id: string
        }
        Update: {
          account_id?: string | null
          id?: string
          merged_at?: string | null
          merged_by?: string
          primary_ticket_id?: string
          reason?: string | null
          secondary_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_merge_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_primary_ticket_id_fkey"
            columns: ["primary_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_primary_ticket_id_fkey"
            columns: ["primary_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_primary_ticket_id_fkey"
            columns: ["primary_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_secondary_ticket_id_fkey"
            columns: ["secondary_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_secondary_ticket_id_fkey"
            columns: ["secondary_ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_secondary_ticket_id_fkey"
            columns: ["secondary_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_similarity_candidates: {
        Row: {
          detected_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_score: number
          status: string | null
          ticket_a_id: string
          ticket_b_id: string
        }
        Insert: {
          detected_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score: number
          status?: string | null
          ticket_a_id: string
          ticket_b_id: string
        }
        Update: {
          detected_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number
          status?: string | null
          ticket_a_id?: string
          ticket_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_similarity_candidates_ticket_a_id_fkey"
            columns: ["ticket_a_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_similarity_candidates_ticket_a_id_fkey"
            columns: ["ticket_a_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_similarity_candidates_ticket_a_id_fkey"
            columns: ["ticket_a_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_similarity_candidates_ticket_b_id_fkey"
            columns: ["ticket_b_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_similarity_candidates_ticket_b_id_fkey"
            columns: ["ticket_b_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_similarity_candidates_ticket_b_id_fkey"
            columns: ["ticket_b_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_summary_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          stale: boolean | null
          summary_text: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          stale?: boolean | null
          summary_text: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          stale?: boolean | null
          summary_text?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_summary_cache_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_summary_cache_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_summary_cache_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_summary_history: {
        Row: {
          created_at: string | null
          generated_by: string | null
          id: string
          regenerated_at: string | null
          regenerated_by: string | null
          summary_text: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          regenerated_at?: string | null
          regenerated_by?: string | null
          summary_text: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          regenerated_at?: string | null
          regenerated_by?: string | null
          summary_text?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_summary_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_sentiment_caches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_summary_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "stale_ticket_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_summary_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          account_id: string
          activity_type: string
          csm_id: string
          date: string
          file_urls: Json | null
          id: string
          interaction_id: string | null
          logged_at: string
          natural_language_input: string | null
          parsed_description: string
          parsed_hours: number
          status: string | null
        }
        Insert: {
          account_id: string
          activity_type: string
          csm_id: string
          date: string
          file_urls?: Json | null
          id?: string
          interaction_id?: string | null
          logged_at?: string
          natural_language_input?: string | null
          parsed_description: string
          parsed_hours: number
          status?: string | null
        }
        Update: {
          account_id?: string
          activity_type?: string
          csm_id?: string
          date?: string
          file_urls?: Json | null
          id?: string
          interaction_id?: string | null
          logged_at?: string
          natural_language_input?: string | null
          parsed_description?: string
          parsed_hours?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          account_id: string
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string
          source_id: string
          source_table: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at: string
          source_id: string
          source_table?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          source_id?: string
          source_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_curation_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          item_id: string | null
          note: string | null
          signal_id: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          signal_id?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          signal_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_curation_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_curation_log_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "wishlist_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_handoffs: {
        Row: {
          created_at: string
          created_by: string | null
          endpoint: string | null
          id: string
          item_id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          target: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          endpoint?: string | null
          id?: string
          item_id: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          target: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          endpoint?: string | null
          id?: string
          item_id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_handoffs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          accepted_at: string | null
          activity_type: string | null
          areas: string[]
          category: string | null
          commercial_commitment: boolean
          confidence_competitor_has: boolean | null
          confidence_wishlist_clients: boolean
          confidence_wishlist_leads: boolean | null
          created_at: string
          created_by: string | null
          criticality: string | null
          demand_accounts: number
          demand_arr: number
          desired_outcome: string | null
          epic_id: string | null
          handed_off_at: string | null
          id: string
          impact_churn_prevention: number | null
          impact_commercial_opportunity: number | null
          impact_differentiation: number | null
          impact_satisfaction: number | null
          kind: string
          matched_feature_id: string | null
          owner_id: string | null
          priority: string | null
          problem: string | null
          product_brief: Json | null
          product_id: string | null
          reach_pct: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          activity_type?: string | null
          areas?: string[]
          category?: string | null
          commercial_commitment?: boolean
          confidence_competitor_has?: boolean | null
          confidence_wishlist_clients?: boolean
          confidence_wishlist_leads?: boolean | null
          created_at?: string
          created_by?: string | null
          criticality?: string | null
          demand_accounts?: number
          demand_arr?: number
          desired_outcome?: string | null
          epic_id?: string | null
          handed_off_at?: string | null
          id?: string
          impact_churn_prevention?: number | null
          impact_commercial_opportunity?: number | null
          impact_differentiation?: number | null
          impact_satisfaction?: number | null
          kind?: string
          matched_feature_id?: string | null
          owner_id?: string | null
          priority?: string | null
          problem?: string | null
          product_brief?: Json | null
          product_id?: string | null
          reach_pct?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          activity_type?: string | null
          areas?: string[]
          category?: string | null
          commercial_commitment?: boolean
          confidence_competitor_has?: boolean | null
          confidence_wishlist_clients?: boolean
          confidence_wishlist_leads?: boolean | null
          created_at?: string
          created_by?: string | null
          criticality?: string | null
          demand_accounts?: number
          demand_arr?: number
          desired_outcome?: string | null
          epic_id?: string | null
          handed_off_at?: string | null
          id?: string
          impact_churn_prevention?: number | null
          impact_commercial_opportunity?: number | null
          impact_differentiation?: number | null
          impact_satisfaction?: number | null
          kind?: string
          matched_feature_id?: string | null
          owner_id?: string | null
          priority?: string | null
          problem?: string | null
          product_brief?: Json | null
          product_id?: string | null
          reach_pct?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "product_epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_matched_feature_id_fkey"
            columns: ["matched_feature_id"]
            isOneToOne: false
            referencedRelation: "product_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_signals: {
        Row: {
          account_id: string
          ai_confidence: number | null
          ai_extracted: boolean
          area: string | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          kind: string | null
          matched_feature_id: string | null
          requester_email: string | null
          requester_name: string | null
          source_id: string | null
          source_type: string
          summary: string | null
          triage_note: string | null
          triage_outcome: string
          triaged_at: string | null
          triaged_by: string | null
          verbatim: string
        }
        Insert: {
          account_id: string
          ai_confidence?: number | null
          ai_extracted?: boolean
          area?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          kind?: string | null
          matched_feature_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          source_id?: string | null
          source_type: string
          summary?: string | null
          triage_note?: string | null
          triage_outcome?: string
          triaged_at?: string | null
          triaged_by?: string | null
          verbatim: string
        }
        Update: {
          account_id?: string
          ai_confidence?: number | null
          ai_extracted?: boolean
          area?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          kind?: string | null
          matched_feature_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          source_id?: string | null
          source_type?: string
          summary?: string | null
          triage_note?: string | null
          triage_outcome?: string
          triaged_at?: string | null
          triaged_by?: string | null
          verbatim?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_signals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_signals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_signals_matched_feature_id_fkey"
            columns: ["matched_feature_id"]
            isOneToOne: false
            referencedRelation: "product_features"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_approvals: {
        Row: {
          account_id: string | null
          approver_id: string | null
          approver_role: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description: string | null
          id: string
          run_step_id: string
          status: string
          title: string
        }
        Insert: {
          account_id?: string | null
          approver_id?: string | null
          approver_role?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          run_step_id: string
          status?: string
          title: string
        }
        Update: {
          account_id?: string | null
          approver_id?: string | null
          approver_role?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          run_step_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_approvals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approvals_run_step_id_fkey"
            columns: ["run_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_run_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_dedup: {
        Row: {
          dedup_key: string
          last_run_at: string
          runs_in_window: number
          workflow_id: string
        }
        Insert: {
          dedup_key: string
          last_run_at?: string
          runs_in_window?: number
          workflow_id: string
        }
        Update: {
          dedup_key?: string
          last_run_at?: string
          runs_in_window?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_dedup_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          published_at: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          published_at?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      workflow_edges: {
        Row: {
          created_at: string
          edge_label: string | null
          id: string
          source_node_id: string
          target_node_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          edge_label?: string | null
          id?: string
          source_node_id: string
          target_node_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          edge_label?: string | null
          id?: string
          source_node_id?: string
          target_node_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_event_queue: {
        Row: {
          account_id: string | null
          attempts: number
          created_at: string
          event_name: string
          event_payload: Json
          id: string
          last_error: string | null
          processed_at: string | null
        }
        Insert: {
          account_id?: string | null
          attempts?: number
          created_at?: string
          event_name: string
          event_payload?: Json
          id?: string
          last_error?: string | null
          processed_at?: string | null
        }
        Update: {
          account_id?: string | null
          attempts?: number
          created_at?: string
          event_name?: string
          event_payload?: Json
          id?: string
          last_error?: string | null
          processed_at?: string | null
        }
        Relationships: []
      }
      workflow_nodes: {
        Row: {
          config: Json
          created_at: string
          id: string
          label: string | null
          node_id: string
          node_type: string
          position_x: number
          position_y: number
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          node_id: string
          node_type: string
          position_x?: number
          position_y?: number
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          node_id?: string
          node_type?: string
          position_x?: number
          position_y?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          input_data: Json
          iteration_index: number | null
          logs: string[]
          next_run_at: string | null
          node_id: string
          node_type: string | null
          output_data: Json
          retry_count: number
          run_id: string
          sla_due_at: string | null
          started_at: string | null
          status: string
          wait_reason: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_data?: Json
          iteration_index?: number | null
          logs?: string[]
          next_run_at?: string | null
          node_id: string
          node_type?: string | null
          output_data?: Json
          retry_count?: number
          run_id: string
          sla_due_at?: string | null
          started_at?: string | null
          status?: string
          wait_reason?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_data?: Json
          iteration_index?: number | null
          logs?: string[]
          next_run_at?: string | null
          node_id?: string
          node_type?: string | null
          output_data?: Json
          retry_count?: number
          run_id?: string
          sla_due_at?: string | null
          started_at?: string | null
          status?: string
          wait_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          account_id: string | null
          completed_at: string | null
          context: Json
          error: string | null
          id: string
          idempotency_key: string | null
          started_at: string
          status: string
          trigger_data: Json
          triggered_by: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          account_id?: string | null
          completed_at?: string | null
          context?: Json
          error?: string | null
          id?: string
          idempotency_key?: string | null
          started_at?: string
          status?: string
          trigger_data?: Json
          triggered_by?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          account_id?: string | null
          completed_at?: string | null
          context?: Json
          error?: string | null
          id?: string
          idempotency_key?: string | null
          started_at?: string
          status?: string
          trigger_data?: Json
          triggered_by?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          created_at: string
          event_name: string | null
          filters: Json
          id: string
          is_enabled: boolean
          max_runs_per_hour: number
          mode: string
          next_scheduled_at: string | null
          schedule_cron: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          event_name?: string | null
          filters?: Json
          id?: string
          is_enabled?: boolean
          max_runs_per_hour?: number
          mode?: string
          next_scheduled_at?: string | null
          schedule_cron?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          event_name?: string | null
          filters?: Json
          id?: string
          is_enabled?: boolean
          max_runs_per_hour?: number
          mode?: string
          next_scheduled_at?: string | null
          schedule_cron?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      auto_assign_metrics: {
        Row: {
          avg_capacity_after: number | null
          avg_capacity_before: number | null
          csms_involved: number | null
          hour: string | null
          total_auto_assigned: number | null
        }
        Relationships: []
      }
      sla_escalation_summary: {
        Row: {
          affected_csms: number | null
          escalation_date: string | null
          sla_status: string | null
          total_escalations: number | null
          unique_tickets: number | null
        }
        Relationships: []
      }
      stale_sentiment_caches: {
        Row: {
          assigned_to: string | null
          hours_since_generation: number | null
          id: string | null
          sentiment_trend_cache_generated_at: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          assigned_to?: string | null
          hours_since_generation?: never
          id?: string | null
          sentiment_trend_cache_generated_at?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          assigned_to?: string | null
          hours_since_generation?: never
          id?: string | null
          sentiment_trend_cache_generated_at?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      stale_ticket_summaries: {
        Row: {
          assigned_to: string | null
          generated_at: string | null
          hours_since_generation: number | null
          id: string | null
          status: string | null
          summary_text: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calc_adoption_score: {
        Args: { account_id_input: string }
        Returns: number
      }
      calc_nps_score: { Args: { account_id_input: string }; Returns: number }
      calc_relationship_score: {
        Args: { account_id_input: string }
        Returns: number
      }
      calc_sla_score: { Args: { account_id_input: string }; Returns: number }
      calc_weighted_health_score: {
        Args: {
          adoption_score: number
          nps_score: number
          relationship_score: number
          sla_score: number
        }
        Returns: Json
      }
      enqueue_workflow_event: {
        Args: { p_account_id: string; p_event_name: string; p_payload: Json }
        Returns: undefined
      }
      get_pending_categorization_suggestions: {
        Args: never
        Returns: {
          account_name: string
          confidence: number
          reasoning: string
          suggested_category: string
          ticket_id: string
          ticket_title: string
        }[]
      }
      get_similar_tickets_for_rag: {
        Args: { p_limit?: number; p_threshold?: number; p_ticket_id: string }
        Returns: {
          category: string
          last_reply_at: string
          latest_reply: string
          similar_ticket_id: string
          similar_ticket_title: string
          similarity_score: number
        }[]
      }
      get_sla_critical_tickets: {
        Args: never
        Returns: {
          account_name: string
          assigned_csm_id: string
          assigned_csm_name: string
          deadline_at: string
          hours_elapsed: number
          priority: string
          sla_status: string
          ticket_id: string
          ticket_title: string
        }[]
      }
      has_module_permission: {
        Args: { p_action: string; p_module: string }
        Returns: boolean
      }
      increment_ticket_merge_count: {
        Args: { ticket_id: string }
        Returns: undefined
      }
      regenerate_sentiment_trend_cache: {
        Args: { ticket_id_input: string }
        Returns: Json
      }
      search_embeddings: {
        Args: {
          match_account_id?: string
          match_limit?: number
          match_source_type?: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          account_id: string
          chunk_index: number
          chunk_text: string
          id: string
          similarity: number
          source_id: string
          source_type: string
        }[]
      }
    }
    Enums: {
      alert_severity: "critical" | "warning" | "info"
      alert_type:
        | "churn_risk"
        | "playbook_trigger"
        | "silent_customer"
        | "renewal_upcoming"
        | "adoption_anomaly"
        | "expansion_signal"
        | "nps_detractor_unactioned"
      urgency_level: "high" | "medium" | "low"
      user_role: "csm" | "csm_senior" | "head_cs" | "admin" | "super_admin"
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
      alert_severity: ["critical", "warning", "info"],
      alert_type: [
        "churn_risk",
        "playbook_trigger",
        "silent_customer",
        "renewal_upcoming",
        "adoption_anomaly",
        "expansion_signal",
        "nps_detractor_unactioned",
      ],
      urgency_level: ["high", "medium", "low"],
      user_role: ["csm", "csm_senior", "head_cs", "admin", "super_admin"],
    },
  },
} as const
