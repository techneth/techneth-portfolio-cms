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
                    published_at: string | null
                    created_at: string
                    updated_at: string
                    created_by: string | null
                    updated_by: string | null
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
                    published_at?: string | null
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
                    published_at?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                    updated_by?: string | null
                }
            }
            case_studies: {
                Row: {
                    id: string
                    title: string
                    slug: string
                    client_name: string | null
                    industry: string | null
                    excerpt: string | null
                    content: string
                    featured_image: string | null
                    gallery: Json | null
                    technologies: string[] | null
                    results: Json | null
                    status: 'draft' | 'published'
                    is_featured: boolean
                    author_id: string | null
                    author_name: string | null
                    seo_title: string | null
                    seo_description: string | null
                    published_at: string | null
                    created_at: string
                    updated_at: string
                    created_by: string | null
                    updated_by: string | null
                }
                Insert: {
                    id?: string
                    title: string
                    slug: string
                    client_name?: string | null
                    industry?: string | null
                    excerpt?: string | null
                    content: string
                    featured_image?: string | null
                    gallery?: Json | null
                    technologies?: string[] | null
                    results?: Json | null
                    status?: 'draft' | 'published'
                    is_featured?: boolean
                    author_id?: string | null
                    author_name?: string | null
                    seo_title?: string | null
                    seo_description?: string | null
                    published_at?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                    updated_by?: string | null
                }
                Update: {
                    id?: string
                    title?: string
                    slug?: string
                    client_name?: string | null
                    industry?: string | null
                    excerpt?: string | null
                    content?: string
                    featured_image?: string | null
                    gallery?: Json | null
                    technologies?: string[] | null
                    results?: Json | null
                    status?: 'draft' | 'published'
                    is_featured?: boolean
                    author_id?: string | null
                    author_name?: string | null
                    seo_title?: string | null
                    seo_description?: string | null
                    published_at?: string | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                    updated_by?: string | null
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
