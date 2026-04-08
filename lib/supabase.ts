import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: number;
          name: string;
          price: number;
          weight: string;
          description: string;
          category: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          price: number;
          weight: string;
          description: string;
          category: string;
          image_url?: string | null;
        };
        Update: {
          name?: string;
          price?: number;
          weight?: string;
          description?: string;
          category?: string;
          image_url?: string | null;
        };
      };
      banners: {
        Row: {
          id: string;
          image: string;
          title: string | null;
          subtitle: string | null;
          discount: string | null;
          created_at: string;
        };
        Insert: {
          image: string;
          title?: string | null;
          subtitle?: string | null;
          discount?: string | null;
        };
        Update: {
          image?: string;
          title?: string | null;
          subtitle?: string | null;
          discount?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_email: string;
          customer_name: string;
          total: number;
          status: string;
          items: any;
          created_at: string;
        };
        Insert: {
          customer_email: string;
          customer_name: string;
          total: number;
          status?: string;
          items: any;
        };
        Update: {
          status?: string;
        };
      };
    };
  };
};
