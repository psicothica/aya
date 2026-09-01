// Tipos do banco (subconjunto usado pela app). Regenere o arquivo completo com:
//   supabase gen types typescript --project-id <ref> --schema public > src/lib/database.types.ts

type Modality = Database["public"]["Enums"]["attendance_modality"];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; phone: string | null; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null; email?: string | null; avatar_url?: string | null; phone?: string | null };
        Update: { full_name?: string | null; email?: string | null; avatar_url?: string | null; phone?: string | null };
        Relationships: [];
      };
      user_roles: {
        Row: { user_id: string; role: Database["public"]["Enums"]["app_role"] };
        Insert: { user_id: string; role: Database["public"]["Enums"]["app_role"] };
        Update: { role?: Database["public"]["Enums"]["app_role"] };
        Relationships: [];
      };
      professional_profiles: {
        Row: {
          user_id: string; profession: Database["public"]["Enums"]["profession_type"];
          council: Database["public"]["Enums"]["council_type"] | null;
          registration_number: string | null; registration_uf: string | null;
          display_name: string | null; avatar_url: string | null;
          headline: string | null; bio: string | null; approach: string | null;
          specialties: string[]; modalities: Modality[];
          city: string | null; uf: string | null; price_min: number | null; price_max: number | null;
          status: Database["public"]["Enums"]["professional_status"];
          approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          user_id: string; profession: Database["public"]["Enums"]["profession_type"];
          council?: Database["public"]["Enums"]["council_type"] | null;
          registration_number?: string | null; registration_uf?: string | null;
          display_name?: string | null; avatar_url?: string | null;
          headline?: string | null; bio?: string | null; approach?: string | null;
          specialties?: string[]; modalities?: Modality[];
          city?: string | null; uf?: string | null; price_min?: number | null; price_max?: number | null;
          status?: Database["public"]["Enums"]["professional_status"];
        };
        Update: {
          profession?: Database["public"]["Enums"]["profession_type"];
          display_name?: string | null; avatar_url?: string | null;
          headline?: string | null; bio?: string | null; approach?: string | null;
          specialties?: string[]; modalities?: Modality[];
          city?: string | null; uf?: string | null; price_min?: number | null; price_max?: number | null;
          status?: Database["public"]["Enums"]["professional_status"];
        };
        Relationships: [];
      };
      patients: {
        Row: { id: string; professional_id: string; client_user_id: string | null; full_name: string; birth_date: string | null; email: string | null; phone: string | null; notes_summary: string | null; avatar_url: string | null; gender: string | null; address: string | null; occupation: string | null; marital_status: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null; is_active: boolean; deleted_at: string | null; created_at: string; updated_at: string };
        Insert: { professional_id: string; full_name: string; client_user_id?: string | null; birth_date?: string | null; email?: string | null; phone?: string | null; notes_summary?: string | null; avatar_url?: string | null; gender?: string | null; address?: string | null; occupation?: string | null; marital_status?: string | null; emergency_contact_name?: string | null; emergency_contact_phone?: string | null; is_active?: boolean; deleted_at?: string | null };
        Update: { full_name?: string; birth_date?: string | null; email?: string | null; phone?: string | null; notes_summary?: string | null; avatar_url?: string | null; gender?: string | null; address?: string | null; occupation?: string | null; marital_status?: string | null; emergency_contact_name?: string | null; emergency_contact_phone?: string | null; is_active?: boolean; deleted_at?: string | null };
        Relationships: [];
      };
      appointments: {
        Row: { id: string; professional_id: string; patient_id: string; starts_at: string; ends_at: string; status: Database["public"]["Enums"]["appointment_status"]; modality: Modality | null; price: number | null; patient_confirmed_at: string | null; created_at: string; updated_at: string };
        Insert: { professional_id: string; patient_id: string; starts_at: string; ends_at: string; status?: Database["public"]["Enums"]["appointment_status"]; modality?: Modality | null; price?: number | null };
        Update: { starts_at?: string; ends_at?: string; status?: Database["public"]["Enums"]["appointment_status"]; modality?: Modality | null; price?: number | null; patient_confirmed_at?: string | null };
        Relationships: [];
      };
      clinical_notes: {
        Row: { id: string; professional_id: string; patient_id: string; appointment_id: string | null; content: string; created_at: string; updated_at: string };
        Insert: { professional_id: string; patient_id: string; content: string; appointment_id?: string | null };
        Update: { content?: string };
        Relationships: [];
      };
      documents: {
        Row: { id: string; professional_id: string; patient_id: string; doc_type: Database["public"]["Enums"]["document_type"]; title: string | null; storage_path: string; category: string; description: string | null; created_at: string };
        Insert: { professional_id: string; patient_id: string; storage_path: string; doc_type?: Database["public"]["Enums"]["document_type"]; title?: string | null; category?: string; description?: string | null };
        Update: { title?: string | null; doc_type?: Database["public"]["Enums"]["document_type"]; category?: string; description?: string | null };
        Relationships: [];
      };
      financial_transactions: {
        Row: { id: string; professional_id: string; appointment_id: string | null; kind: Database["public"]["Enums"]["transaction_type"]; category: string | null; amount: number; status: Database["public"]["Enums"]["payment_status"]; occurred_on: string; created_at: string };
        Insert: { professional_id: string; kind: Database["public"]["Enums"]["transaction_type"]; amount: number; appointment_id?: string | null; category?: string | null; status?: Database["public"]["Enums"]["payment_status"]; occurred_on?: string };
        Update: { category?: string | null; amount?: number; status?: Database["public"]["Enums"]["payment_status"]; occurred_on?: string };
        Relationships: [];
      };
      booking_requests: {
        Row: { id: string; client_id: string; professional_id: string; client_name: string; client_contact: string | null; requested_at: string | null; note: string | null; status: Database["public"]["Enums"]["booking_status"]; created_at: string; updated_at: string };
        Insert: { client_id: string; professional_id: string; client_name: string; client_contact?: string | null; requested_at?: string | null; note?: string | null; status?: Database["public"]["Enums"]["booking_status"] };
        Update: { status?: Database["public"]["Enums"]["booking_status"]; note?: string | null; requested_at?: string | null };
        Relationships: [];
      };
      activities: {
        Row: { id: string; host_id: string | null; title: string; description: string | null; modality: Modality; starts_at: string | null; capacity: number | null; price: number | null; status: Database["public"]["Enums"]["activity_status"]; created_at: string; updated_at: string };
        Insert: { title: string; host_id?: string | null; description?: string | null; modality?: Modality; starts_at?: string | null; capacity?: number | null; price?: number | null; status?: Database["public"]["Enums"]["activity_status"] };
        Update: { title?: string; description?: string | null; modality?: Modality; starts_at?: string | null; capacity?: number | null; price?: number | null; status?: Database["public"]["Enums"]["activity_status"] };
        Relationships: [];
      };
      activity_enrollments: {
        Row: { id: string; activity_id: string; client_id: string; status: Database["public"]["Enums"]["enrollment_status"]; created_at: string };
        Insert: { activity_id: string; client_id: string; status?: Database["public"]["Enums"]["enrollment_status"] };
        Update: { status?: Database["public"]["Enums"]["enrollment_status"] };
        Relationships: [];
      };
      apps: {
        Row: { id: string; name: string; description: string | null; access_type: Database["public"]["Enums"]["app_access_type"]; launch_url: string | null; meta: Record<string, unknown>; is_active: boolean; created_at: string };
        Insert: { name: string; description?: string | null; access_type?: Database["public"]["Enums"]["app_access_type"]; launch_url?: string | null; is_active?: boolean };
        Update: { name?: string; description?: string | null; is_active?: boolean };
        Relationships: [];
      };
      app_usage: {
        Row: { id: string; app_id: string; client_id: string; last_used_at: string; usage_count: number };
        Insert: { app_id: string; client_id: string; usage_count?: number };
        Update: { last_used_at?: string; usage_count?: number };
        Relationships: [];
      };
      posts: {
        Row: { id: string; author_id: string; title: string; body: string | null; media: unknown[]; category: string | null; tags: string[]; status: Database["public"]["Enums"]["post_status"]; moderated_by: string | null; moderated_at: string | null; published_at: string | null; deleted_at: string | null; deletion_reason: string | null; created_at: string; updated_at: string };
        Insert: { author_id: string; title: string; body?: string | null; media?: unknown[]; category?: string | null; tags?: string[]; status?: Database["public"]["Enums"]["post_status"] };
        Update: { title?: string; body?: string | null; category?: string | null; tags?: string[]; status?: Database["public"]["Enums"]["post_status"]; moderated_by?: string | null; moderated_at?: string | null; published_at?: string | null; deleted_at?: string | null; deletion_reason?: string | null };
        Relationships: [];
      };
      interactions: {
        Row: { id: string; post_id: string; user_id: string; kind: Database["public"]["Enums"]["interaction_type"]; comment_body: string | null; created_at: string };
        Insert: { post_id: string; user_id: string; kind: Database["public"]["Enums"]["interaction_type"]; comment_body?: string | null };
        Update: { comment_body?: string | null };
        Relationships: [];
      };
      favorites: {
        Row: { user_id: string; target_type: Database["public"]["Enums"]["favorite_target"]; target_id: string; created_at: string };
        Insert: { user_id: string; target_type: Database["public"]["Enums"]["favorite_target"]; target_id: string };
        Update: { target_id?: string };
        Relationships: [];
      };
      family_tree_nodes: {
        Row: { id: string; professional_id: string; patient_id: string; label: string; meta: Record<string, unknown>; created_at: string };
        Insert: { professional_id: string; patient_id: string; label: string; meta?: Record<string, unknown> };
        Update: { label?: string; meta?: Record<string, unknown> };
        Relationships: [];
      };
      family_relations: {
        Row: { id: string; professional_id: string; from_node_id: string; to_node_id: string; relation_label: string | null; created_at: string };
        Insert: { professional_id: string; from_node_id: string; to_node_id: string; relation_label?: string | null };
        Update: { relation_label?: string | null };
        Relationships: [];
      };
      notifications: {
        Row: { id: string; professional_id: string; appointment_id: string | null; kind: string; channel: string; recipient: string | null; status: string; error: string | null; scheduled_for: string | null; sent_at: string | null; created_at: string };
        Insert: { professional_id: string; appointment_id?: string | null; kind: string; channel?: string; recipient?: string | null; status?: string; scheduled_for?: string | null };
        Update: { status?: string; error?: string | null; sent_at?: string | null; recipient?: string | null };
        Relationships: [];
      };
      programs: {
        Row: { id: string; author_id: string | null; title: string; description: string | null; category: string | null; is_paid: boolean; price: number | null; status: string; created_at: string };
        Insert: { title: string; author_id?: string | null; description?: string | null; category?: string | null; is_paid?: boolean; price?: number | null; status?: string };
        Update: { title?: string; description?: string | null; category?: string | null; is_paid?: boolean; price?: number | null; status?: string };
        Relationships: [];
      };
      program_activities: {
        Row: { id: string; program_id: string; position: number; title: string; instructions: string | null; kind: string; created_at: string };
        Insert: { program_id: string; title: string; position?: number; instructions?: string | null; kind?: string };
        Update: { title?: string; position?: number; instructions?: string | null; kind?: string };
        Relationships: [];
      };
      program_licenses: {
        Row: { id: string; professional_id: string; program_id: string; paid: boolean; acquired_at: string };
        Insert: { professional_id: string; program_id: string; paid?: boolean };
        Update: { paid?: boolean };
        Relationships: [];
      };
      program_assignments: {
        Row: { id: string; professional_id: string; patient_id: string; patient_user_id: string | null; program_id: string | null; title: string; status: string; assigned_at: string };
        Insert: { professional_id: string; patient_id: string; title: string; patient_user_id?: string | null; program_id?: string | null; status?: string };
        Update: { title?: string; status?: string };
        Relationships: [];
      };
      assignment_activities: {
        Row: { id: string; assignment_id: string; professional_id: string; patient_user_id: string | null; position: number; title: string; instructions: string | null; created_at: string };
        Insert: { assignment_id: string; professional_id: string; title: string; patient_user_id?: string | null; position?: number; instructions?: string | null };
        Update: { title?: string; position?: number; instructions?: string | null };
        Relationships: [];
      };
      assignment_progress: {
        Row: { id: string; assignment_activity_id: string; assignment_id: string; professional_id: string; patient_user_id: string | null; done: boolean; done_at: string | null; patient_note: string | null; updated_at: string };
        Insert: { assignment_activity_id: string; assignment_id: string; professional_id: string; patient_user_id?: string | null; done?: boolean; done_at?: string | null; patient_note?: string | null; updated_at?: string };
        Update: { done?: boolean; done_at?: string | null; patient_note?: string | null; updated_at?: string };
        Relationships: [];
      };
      courses: {
        Row: { id: string; author_id: string | null; title: string; description: string | null; audience: string; is_paid: boolean; price: number | null; status: string; created_at: string };
        Insert: { title: string; author_id?: string | null; description?: string | null; audience?: string; is_paid?: boolean; price?: number | null; status?: string };
        Update: { title?: string; description?: string | null; audience?: string; is_paid?: boolean; price?: number | null; status?: string };
        Relationships: [];
      };
      course_modules: {
        Row: { id: string; course_id: string; position: number; title: string };
        Insert: { course_id: string; title: string; position?: number };
        Update: { title?: string; position?: number };
        Relationships: [];
      };
      course_lessons: {
        Row: { id: string; module_id: string; course_id: string; position: number; title: string; content: string | null; kind: string; video_url: string | null };
        Insert: { module_id: string; course_id: string; title: string; position?: number; content?: string | null; kind?: string; video_url?: string | null };
        Update: { title?: string; position?: number; content?: string | null; kind?: string; video_url?: string | null };
        Relationships: [];
      };
      course_enrollments: {
        Row: { id: string; user_id: string; course_id: string; paid: boolean; enrolled_at: string };
        Insert: { user_id: string; course_id: string; paid?: boolean };
        Update: { paid?: boolean };
        Relationships: [];
      };
      lesson_progress: {
        Row: { id: string; user_id: string; lesson_id: string; course_id: string; completed: boolean; completed_at: string };
        Insert: { user_id: string; lesson_id: string; course_id: string; completed?: boolean };
        Update: { completed?: boolean };
        Relationships: [];
      };
      session_records: {
        Row: { id: string; professional_id: string; patient_id: string; appointment_id: string | null; session_date: string; mood_scale: number | null; mood_notes: string | null; risk_level: string | null; risk_notes: string | null; medication_notes: string | null; sleep_notes: string | null; eating_notes: string | null; physical_notes: string | null; mobility_notes: string | null; social_notes: string | null; general_notes: string | null; created_at: string; updated_at: string };
        Insert: { professional_id: string; patient_id: string; appointment_id?: string | null; session_date?: string; mood_scale?: number | null; mood_notes?: string | null; risk_level?: string | null; risk_notes?: string | null; medication_notes?: string | null; sleep_notes?: string | null; eating_notes?: string | null; physical_notes?: string | null; mobility_notes?: string | null; social_notes?: string | null; general_notes?: string | null };
        Update: { session_date?: string; mood_scale?: number | null; mood_notes?: string | null; risk_level?: string | null; risk_notes?: string | null; medication_notes?: string | null; sleep_notes?: string | null; eating_notes?: string | null; physical_notes?: string | null; mobility_notes?: string | null; social_notes?: string | null; general_notes?: string | null };
        Relationships: [];
      };
      form_templates: {
        Row: { id: string; author_id: string | null; title: string; description: string | null; category: string | null; default_respondent: string; status: string; created_at: string };
        Insert: { title: string; author_id?: string | null; description?: string | null; category?: string | null; default_respondent?: string; status?: string };
        Update: { title?: string; description?: string | null; category?: string | null; default_respondent?: string; status?: string };
        Relationships: [];
      };
      form_template_questions: {
        Row: { id: string; template_id: string; author_id: string | null; section: string | null; position: number; kind: string; label: string; help_text: string | null; options: unknown | null; required: boolean; created_at: string };
        Insert: { template_id: string; kind: string; label: string; author_id?: string | null; section?: string | null; position?: number; help_text?: string | null; options?: unknown | null; required?: boolean };
        Update: { section?: string | null; position?: number; kind?: string; label?: string; help_text?: string | null; options?: unknown | null; required?: boolean };
        Relationships: [];
      };
      form_assignments: {
        Row: { id: string; professional_id: string; patient_id: string; patient_user_id: string | null; template_id: string | null; title: string; description: string | null; respondent: string; status: string; assigned_at: string; completed_at: string | null };
        Insert: { professional_id: string; patient_id: string; title: string; respondent: string; patient_user_id?: string | null; template_id?: string | null; description?: string | null; status?: string; completed_at?: string | null };
        Update: { title?: string; description?: string | null; status?: string; completed_at?: string | null };
        Relationships: [];
      };
      form_assignment_questions: {
        Row: { id: string; assignment_id: string; professional_id: string; patient_user_id: string | null; section: string | null; position: number; kind: string; label: string; help_text: string | null; options: unknown | null; required: boolean; created_at: string };
        Insert: { assignment_id: string; professional_id: string; kind: string; label: string; patient_user_id?: string | null; section?: string | null; position?: number; help_text?: string | null; options?: unknown | null; required?: boolean };
        Update: { section?: string | null; position?: number; kind?: string; label?: string; help_text?: string | null; options?: unknown | null; required?: boolean };
        Relationships: [];
      };
      form_responses: {
        Row: { id: string; assignment_question_id: string; assignment_id: string; professional_id: string; patient_user_id: string | null; value_text: string | null; value_number: number | null; value_bool: boolean | null; answered_at: string; updated_at: string };
        Insert: { assignment_question_id: string; assignment_id: string; professional_id: string; patient_user_id?: string | null; value_text?: string | null; value_number?: number | null; value_bool?: boolean | null; answered_at?: string; updated_at?: string };
        Update: { value_text?: string | null; value_number?: number | null; value_bool?: boolean | null; updated_at?: string };
        Relationships: [];
      };
      contract_templates: {
        Row: { id: string; author_id: string | null; title: string; body: string; version: number; status: string; created_at: string };
        Insert: { title: string; body: string; author_id?: string | null; version?: number; status?: string };
        Update: { title?: string; body?: string; version?: number; status?: string };
        Relationships: [];
      };
      contract_assignments: {
        Row: { id: string; professional_id: string; patient_id: string; patient_user_id: string | null; title: string; body: string; version: number; status: string; sent_at: string; created_at: string };
        Insert: { professional_id: string; patient_id: string; title: string; body: string; patient_user_id?: string | null; version?: number; status?: string; sent_at?: string };
        Update: { status?: string };
        Relationships: [];
      };
      contract_acceptances: {
        Row: { id: string; assignment_id: string; patient_user_id: string; accepted_meta: string | null; accepted_at: string; created_at: string };
        Insert: { assignment_id: string; patient_user_id: string; accepted_meta?: string | null; accepted_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      audit_deletions: {
        Row: { id: string; professional_id: string; entity_type: string; entity_id: string; action: string; reason: string | null; old_data: Record<string, unknown> | null; created_at: string };
        Insert: { professional_id: string; entity_type: string; entity_id: string; action: string; reason?: string | null; old_data?: Record<string, unknown> | null };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Enums: {
      app_role: "client" | "professional" | "admin";
      profession_type:
        | "psychologist" | "psychiatrist" | "physician" | "nutritionist"
        | "physiotherapist" | "occupational_therapist" | "speech_therapist"
        | "nurse" | "social_worker" | "other";
      council_type: "CRP" | "CRM" | "CRN" | "CREFITO" | "CREFONO" | "COREN" | "CRESS" | "other";
      professional_status: "pending" | "approved" | "suspended" | "rejected";
      attendance_modality: "in_person" | "online" | "hybrid";
      appointment_status: "scheduled" | "completed" | "cancelled" | "no_show" | "rescheduled";
      payment_status: "pending" | "paid" | "overdue" | "refunded" | "cancelled";
      transaction_type: "income" | "expense";
      document_type: "report" | "anamnesis" | "consent" | "receipt" | "invoice" | "other";
      booking_status: "requested" | "accepted" | "declined" | "cancelled";
      activity_status: "open" | "full" | "closed" | "cancelled";
      enrollment_status: "reserved" | "confirmed" | "cancelled" | "attended";
      app_access_type: "linked_sso" | "embedded";
      post_status: "draft" | "pending_review" | "published" | "rejected" | "archived";
      interaction_type: "like" | "save" | "comment" | "report";
      favorite_target: "professional" | "activity" | "app";
    };
  };
};
