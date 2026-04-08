import { supabase } from './supabase';

export interface Banner {
  id: number;
  title: string | null;
  description?: string | null;
  image_url: string;
  link_url?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const bannerService = {
  async getBanners(): Promise<Banner[]> {
    try {
      console.log('BannerService: Fetching banners from Supabase...');
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('BannerService: Supabase error:', error);
        throw error;
      }
      console.log('BannerService: Got', data?.length || 0, 'banners');
      return data || [];
    } catch (err) {
      console.error('BannerService: Exception in getBanners:', err);
      throw err;
    }
  },

  async getBanner(id: number): Promise<Banner> {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Banner not found');
    return data;
  },

  async createBanner(banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner> {
    const { data, error } = await supabase
      .from('banners')
      .insert([banner])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create banner');
    return data;
  },

  async updateBanner(id: number, updates: Partial<Omit<Banner, 'id' | 'created_at' | 'updated_at'>>): Promise<Banner> {
    const { data, error } = await supabase
      .from('banners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update banner');
    return data;
  },

  async deleteBanner(id: number): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
