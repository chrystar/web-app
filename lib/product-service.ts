import { supabase } from "./supabase";
import type { Database } from "./supabase";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export const productService = {
  // Get all products
  async getProducts() {
    try {
      console.log('ProductService: Fetching all products from Supabase...');
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('ProductService: Supabase error:', error);
        throw error;
      }
      console.log('ProductService: Got', data?.length || 0, 'products');
      return data as Product[];
    } catch (err) {
      console.error('ProductService: Exception in getProducts:', err);
      throw err;
    }
  },

  // Get product by ID
  async getProduct(id: number) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Product;
  },

  // Create product
  async createProduct(product: ProductInsert) {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  // Update product
  async updateProduct(id: number, updates: ProductUpdate) {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  // Delete product
  async deleteProduct(id: number) {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  // Get products by category
  async getProductsByCategory(category: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Product[];
  },

  // Get product categories
  async getCategories() {
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .neq("category", null);

    if (error) throw error;

    // Get unique categories
    const categories = Array.from(
      new Set(data.map((item) => item.category).filter(Boolean))
    );
    return categories;
  },

  // Search products
  async searchProducts(query: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .or(
        `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Product[];
  },

  // Bulk delete products
  async deleteProducts(ids: number[]) {
    const { error } = await supabase
      .from("products")
      .delete()
      .in("id", ids);

    if (error) throw error;
    return true;
  },
};
