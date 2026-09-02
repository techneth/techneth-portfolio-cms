export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    name: string
                    email: string
                    role: 'super_admin' | 'admin' | 'editor'
                    avatar_url: string | null
                    is_active: boolean
                    last_login: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    name: string
                    email: string
                    role?: 'super_admin' | 'admin' | 'editor'
                    avatar_url?: string | null
                    is_active?: boolean
                    last_login?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    role?: 'super_admin' | 'admin' | 'editor'
                    avatar_url?: string | null
                    is_active?: boolean
                    last_login?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            blogs: {
                Row: {
                    id: string
                    title: string
                    slug: string
                    excerpt: string | null
                    content: string
                    featured_image: string | null
                    status: 'draft' | 'published'
                    author_id: string | null
                    author_name: string | null
                    seo_title: string | null
                    seo_description: string | null
                    seo_keywords: string[] | null
                    category: string | null
                    featured: boolean
                    published_at: string | null
                    is_english: boolean | null
                    pair_id: string | null
                    external_id: string | null
                    external_source: string | null
                    created_at: string
                    updated_at: string
                    created_by: string | null
                    updated_by: string | null
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    title: string
                    slug: string
                    excerpt?: string | null
                    content: string
                    featured_image?: string | null
                    status?: 'draft' | 'published'
                    author_id?: string | null
                    author_name?: string | null
                    seo_title?: string | null
                    seo_description?: string | null
                    seo_keywords?: string[] | null
                    category?: string | null
                    featured?: boolean
                    published_at?: string | null
                    is_english?: boolean | null
                    pair_id?: string | null
                    external_id?: string | null
                    external_source?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                    updated_by?: string | null
                }
                Update: {
                    id?: string
                    title?: string
                    slug?: string
                    excerpt?: string | null
                    content?: string
                    featured_image?: string | null
                    status?: 'draft' | 'published'
                    author_id?: string | null
                    author_name?: string | null
                    seo_title?: string | null
                    seo_description?: string | null
                    seo_keywords?: string[] | null
                    category?: string | null
                    featured?: boolean
                    published_at?: string | null
                    is_english?: boolean | null
                    pair_id?: string | null
                    external_id?: string | null
                    external_source?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                    updated_by?: string | null
                }
            }
            neth_webhook_deliveries: {
                Row: {
                    id: string
                    delivery_id: string
                    event: string | null
                    external_id: string | null
                    blog_id: string | null
                    slug: string | null
                    status: 'processed' | 'skipped' | 'failed'
                    error: string | null
                    payload: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    delivery_id: string
                    event?: string | null
                    external_id?: string | null
                    blog_id?: string | null
                    slug?: string | null
                    status?: 'processed' | 'skipped' | 'failed'
                    error?: string | null
                    payload?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    delivery_id?: string
                    event?: string | null
                    external_id?: string | null
                    blog_id?: string | null
                    slug?: string | null
                    status?: 'processed' | 'skipped' | 'failed'
                    error?: string | null
                    payload?: Json | null
                    created_at?: string
                }
            }
            case_studies: {
                Row: {
                    id: string
                    title: string
                    slug: string
                    category: string | null
                    client_name: string | null
                    industry: string | null
                    excerpt: string | null
                    content: string
                    featured_image: string | null
                    gallery: Json | null
                    technologies: string[] | null
                    results: Json | null
                    keywords: string[] | null
                    status: 'draft' | 'published'
                    featured: boolean
                    author_id: string | null
                    author_name: string | null
                    seo_title: string | null
                    seo_description: string | null
                    published_at: string | null
                    is_english: boolean | null
                    pair_id: string | null
                    // Narrative fields (see add_case_study_narrative_fields.sql)
                    subtitle: string | null
                    hero_image: string | null
                    client_logo: string | null
                    client_location: string | null
                    timeline: string | null
                    project_year: string | null
                    platforms: Json | null
                    services: Json | null
                    industries: Json | null
                    live_url: string | null
                    mission: string | null
                    mission_image: string | null
                    vision: string | null
                    vision_image: string | null
                    goals: Json | null
                    challenge: string | null
                    challenge_points: Json | null
                    challenge_image: string | null
                    solution: string | null
                    solution_points: Json | null
                    solution_image: string | null
                    outcome: string | null
                    outcome_image: string | null
                    metrics: Json | null
                    phases: Json | null
                    features: Json | null
                    gallery_images: Json | null
                    technologies_note: string | null
                    technologies_image: string | null
                    typography: Json | null
                    color_palette: Json | null
                    identity_note: string | null
                    identity_image: string | null
                    testimonial_quote: string | null
                    testimonial_author: string | null
                    testimonial_role: string | null
                    testimonial_avatar: string | null
                    created_at: string
                    updated_at: string
                    created_by: string | null
                    updated_by: string | null
                    deleted_at?: string | null
                }
                Insert: {
                    id?: string
                    title: string
                    slug: string
                    category?: string | null
                    client_name?: string | null
                    industry?: string | null
                    excerpt?: string | null
                    content: string
                    featured_image?: string | null
                    gallery?: Json | null
                    technologies?: string[] | null
                    keywords?: string[] | null
                    results?: Json | null
                    status?: 'draft' | 'published'
                    featured?: boolean
                    author_id?: string | null
                    author_name?: string | null
                    seo_title?: string | null
                    seo_description?: string | null
                    published_at?: string | null
                    is_english?: boolean | null
                    pair_id?: string | null
                    subtitle?: string | null
                    hero_image?: string | null
                    client_logo?: string | null
                    client_location?: string | null
                    timeline?: string | null
                    project_year?: string | null
                    platforms?: Json | null
                    services?: Json | null
                    industries?: Json | null
                    live_url?: string | null
                    mission?: string | null
                    mission_image?: string | null
                    vision?: string | null
                    vision_image?: string | null
                    goals?: Json | null
                    challenge?: string | null
                    challenge_points?: Json | null
                    challenge_image?: string | null
                    solution?: string | null
                    solution_points?: Json | null
                    solution_image?: string | null
                    outcome?: string | null
                    outcome_image?: string | null
                    metrics?: Json | null
                    phases?: Json | null
                    features?: Json | null
                    gallery_images?: Json | null
                    technologies_note?: string | null
                    technologies_image?: string | null
                    typography?: Json | null
                    color_palette?: Json | null
                    identity_note?: string | null
                    identity_image?: string | null
                    testimonial_quote?: string | null
                    testimonial_author?: string | null
                    testimonial_role?: string | null
                    testimonial_avatar?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                    updated_by?: string | null
                }
                Update: {
                    id?: string
                    title?: string
                    slug?: string
                    category?: string | null
                    client_name?: string | null
                    industry?: string | null
                    excerpt?: string | null
                    content?: string
                    featured_image?: string | null
                    gallery?: Json | null
                    technologies?: string[] | null
                    keywords?: string[] | null
                    results?: Json | null
                    status?: 'draft' | 'published'
                    featured?: boolean
                    author_id?: string | null
                    author_name?: string | null
                    seo_title?: string | null
                    seo_description?: string | null
                    published_at?: string | null
                    is_english?: boolean | null
                    pair_id?: string | null
                    subtitle?: string | null
                    hero_image?: string | null
                    client_logo?: string | null
                    client_location?: string | null
                    timeline?: string | null
                    project_year?: string | null
                    platforms?: Json | null
                    services?: Json | null
                    industries?: Json | null
                    live_url?: string | null
                    mission?: string | null
                    mission_image?: string | null
                    vision?: string | null
                    vision_image?: string | null
                    goals?: Json | null
                    challenge?: string | null
                    challenge_points?: Json | null
                    challenge_image?: string | null
                    solution?: string | null
                    solution_points?: Json | null
                    solution_image?: string | null
                    outcome?: string | null
                    outcome_image?: string | null
                    metrics?: Json | null
                    phases?: Json | null
                    features?: Json | null
                    gallery_images?: Json | null
                    technologies_note?: string | null
                    technologies_image?: string | null
                    typography?: Json | null
                    color_palette?: Json | null
                    identity_note?: string | null
                    identity_image?: string | null
                    testimonial_quote?: string | null
                    testimonial_author?: string | null
                    testimonial_role?: string | null
                    testimonial_avatar?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                    updated_by?: string | null
                }
            }
            jobs: {
                Row: {
                    id: string
                    title: string
                    department: string
                    location: string
                    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship'
                    experience_level: 'entry' | 'mid' | 'senior' | 'lead' | null
                    description: string
                    requirements: string[]
                    responsibilities: string[]
                    benefits: string[]
                    salary_range: string | null
                    is_remote: boolean
                    is_active: boolean
                    application_deadline: string | null
                    created_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    department: string
                    location: string
                    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship'
                    experience_level?: 'entry' | 'mid' | 'senior' | 'lead' | null
                    description: string
                    requirements?: string[]
                    responsibilities?: string[]
                    benefits?: string[]
                    salary_range?: string | null
                    is_remote?: boolean
                    is_active?: boolean
                    application_deadline?: string | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    department?: string
                    location?: string
                    employment_type?: 'full-time' | 'part-time' | 'contract' | 'internship'
                    experience_level?: 'entry' | 'mid' | 'senior' | 'lead' | null
                    description?: string
                    requirements?: string[]
                    responsibilities?: string[]
                    benefits?: string[]
                    salary_range?: string | null
                    is_remote?: boolean
                    is_active?: boolean
                    application_deadline?: string | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            job_applications: {
                Row: {
                    id: string
                    job_id: string | null
                    job_title_snapshot: string
                    full_name: string
                    email: string
                    phone: string | null
                    experience: string | null
                    expected_salary: string | null
                    linkedin: string | null
                    portfolio: string | null
                    additional_info: string | null
                    resume_file_name: string | null
                    resume_file_path: string | null
                    resume_file_url: string | null
                    cover_letter_file_name: string | null
                    cover_letter_file_path: string | null
                    cover_letter_file_url: string | null
                    status: 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'
                    status_notes: string | null
                    last_emailed_at: string | null
                    communication_history: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    job_id?: string | null
                    job_title_snapshot: string
                    full_name: string
                    email: string
                    phone?: string | null
                    experience?: string | null
                    expected_salary?: string | null
                    linkedin?: string | null
                    portfolio?: string | null
                    additional_info?: string | null
                    resume_file_name?: string | null
                    resume_file_path?: string | null
                    resume_file_url?: string | null
                    cover_letter_file_name?: string | null
                    cover_letter_file_path?: string | null
                    cover_letter_file_url?: string | null
                    status?: 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'
                    status_notes?: string | null
                    last_emailed_at?: string | null
                    communication_history?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    job_id?: string | null
                    job_title_snapshot?: string
                    full_name?: string
                    email?: string
                    phone?: string | null
                    experience?: string | null
                    expected_salary?: string | null
                    linkedin?: string | null
                    portfolio?: string | null
                    additional_info?: string | null
                    resume_file_name?: string | null
                    resume_file_path?: string | null
                    resume_file_url?: string | null
                    cover_letter_file_name?: string | null
                    cover_letter_file_path?: string | null
                    cover_letter_file_url?: string | null
                    status?: 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'
                    status_notes?: string | null
                    last_emailed_at?: string | null
                    communication_history?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            contact_submissions: {
                Row: {
                    id: string
                    name: string
                    email: string
                    phone: string | null
                    company: string | null
                    subject: string | null
                    message: string
                    status: 'unread' | 'read' | 'replied' | 'archived'
                    priority: 'low' | 'normal' | 'high'
                    assigned_to: string | null
                    assigned_to_name: string | null
                    reply_sent_by: string | null
                    reply_sent_by_name: string | null
                    reply_sent_at: string | null
                    internal_notes: string | null
                    ip_address: string | null
                    user_agent: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    email: string
                    phone?: string | null
                    company?: string | null
                    subject?: string | null
                    message: string
                    status?: 'unread' | 'read' | 'replied' | 'archived'
                    priority?: 'low' | 'normal' | 'high'
                    assigned_to?: string | null
                    assigned_to_name?: string | null
                    reply_sent_by?: string | null
                    reply_sent_by_name?: string | null
                    reply_sent_at?: string | null
                    internal_notes?: string | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    phone?: string | null
                    company?: string | null
                    subject?: string | null
                    message?: string
                    status?: 'unread' | 'read' | 'replied' | 'archived'
                    priority?: 'low' | 'normal' | 'high'
                    assigned_to?: string | null
                    assigned_to_name?: string | null
                    reply_sent_by?: string | null
                    reply_sent_by_name?: string | null
                    reply_sent_at?: string | null
                    internal_notes?: string | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            activity_logs: {
                Row: {
                    id: string
                    user_id: string | null
                    user_name: string
                    user_role: string
                    action_type: string
                    resource_type: string
                    resource_id: string | null
                    resource_title: string | null
                    changes: Json | null
                    ip_address: string | null
                    user_agent: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    user_name: string
                    user_role: string
                    action_type: string
                    resource_type: string
                    resource_id?: string | null
                    resource_title?: string | null
                    changes?: Json | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    user_name?: string
                    user_role?: string
                    action_type?: string
                    resource_type?: string
                    resource_id?: string | null
                    resource_title?: string | null
                    changes?: Json | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
            }
            settings: {
                Row: {
                    key: string
                    value: Json
                    description: string | null
                    updated_by: string | null
                    updated_at: string
                }
                Insert: {
                    key: string
                    value: Json
                    description?: string | null
                    updated_by?: string | null
                    updated_at?: string
                }
                Update: {
                    key?: string
                    value?: Json
                    description?: string | null
                    updated_by?: string | null
                    updated_at?: string
                }
            }
        }
        Views: {
            dashboard_stats: {
                Row: {
                    published_blogs: number | null
                    draft_blogs: number | null
                    published_case_studies: number | null
                    unread_contacts: number | null
                    read_contacts: number | null
                    active_users: number | null
                }
            }
        }
    }
}
