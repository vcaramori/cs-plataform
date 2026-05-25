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
      account_playbook_tasks: {
        Row: {
          account_playbook_id: string
          assigned_to: string | null
          comments: Json | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_custom: boolean | null
          notes: string | null
          status: string | null
          task_id: string | null
          task_type: string | null
          time_spent_hours: number | null
          title: string | null
        }
        Insert: {
          account_playbook_id: string
          assigned_to?: string | null
          comments?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_custom?: boolean | null
          notes?: string | null
          status?: string | null
          task_id?: string | null
          task_type?: string | null
          time_spent_hours?: number | null
          title?: string | null
        }
        Update: {
          account_playbook_id?: string
          assigned_to?: string | null
          comments?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_custom?: boolean | null
          notes?: string | null
          status?: string | null
          task_id?: string | null
          task_type?: string | null
          time_spent_hours?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_playbook_tasks_account_playbook_id_fkey"
            columns: ["account_playbook_id"]
            isOneToOne: false
            referencedRelation: "account_playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_playbook_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "playbook_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      account_playbooks: {
        Row: {
          account_id: string
          completed_at: string | null
          csm_owner_id: string | null
          expected_end_date: string | null
          id: string
          objective: string | null
          started_at: string | null
          status: string | null
          success_criteria: string | null
          template_id: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          csm_owner_id?: string | null
          expected_end_date?: string | null
          id?: string
          objective?: string | null
          started_at?: string | null
          status?: string | null
          success_criteria?: string | null
          template_id: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          csm_owner_id?: string | null
          expected_end_date?: string | null
          id?: string
          objective?: string | null
          started_at?: string | null
          status?: string | null
          success_criteria?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_playbooks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_playbooks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "playbook_templates"
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
      playbook_audit_logs: {
        Row: {
          account_playbook_id: string
          account_playbook_task_id: string | null
          action: string
          actor_id: string
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          account_playbook_id: string
          account_playbook_task_id?: string | null
          action: string
          actor_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          account_playbook_id?: string
          account_playbook_task_id?: string | null
          action?: string
          actor_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_audit_logs_account_playbook_id_fkey"
            columns: ["account_playbook_id"]
            isOneToOne: false
            referencedRelation: "account_playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_audit_logs_account_playbook_task_id_fkey"
            columns: ["account_playbook_task_id"]
            isOneToOne: false
            referencedRelation: "account_playbook_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_tasks: {
        Row: {
          action_payload: Json | null
          assigned_role: string | null
          created_at: string | null
          description: string | null
          due_days_from_start: number | null
          estimated_hours: number | null
          feature_tags: string[] | null
          id: string
          step_order: number
          task_type: string | null
          template_id: string
          title: string
        }
        Insert: {
          action_payload?: Json | null
          assigned_role?: string | null
          created_at?: string | null
          description?: string | null
          due_days_from_start?: number | null
          estimated_hours?: number | null
          feature_tags?: string[] | null
          id?: string
          step_order: number
          task_type?: string | null
          template_id: string
          title: string
        }
        Update: {
          action_payload?: Json | null
          assigned_role?: string | null
          created_at?: string | null
          description?: string | null
          due_days_from_start?: number | null
          estimated_hours?: number | null
          feature_tags?: string[] | null
          id?: string
          step_order?: number
          task_type?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "playbook_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_templates: {
        Row: {
          created_at: string | null
          description: string | null
          graph_json: Json | null
          id: string
          is_active: boolean | null
          name: string
          trigger_condition: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          graph_json?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_condition?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          graph_json?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_condition?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          tier_rank: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tier_rank?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tier_rank?: number | null
        }
        Relationships: []
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
    },
  },
} as const
