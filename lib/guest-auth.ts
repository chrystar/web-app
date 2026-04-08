import { supabase } from "./supabase";

export interface GuestUser {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  authMethod?: "email" | "google";
}

interface GuestUserRow {
  id: string;
  email: string;
  phone?: string | null;
  first_name: string;
  last_name: string;
  created_at: string;
  auth_method?: "email" | "google";
}

export const guestAuth = {
  // Create guest user with email/password
  async signUpWithEmail(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<GuestUser> {
    try {
      if (!data.email || !data.password || !data.firstName || !data.lastName) {
        throw new Error("Please fill in all required fields");
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone || null,
            auth_method: "email",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          throw new Error("Email already registered. Please log in instead.");
        }
        throw signUpError;
      }

      const authUser = authData.user;
      if (!authUser?.email) {
        throw new Error("Sign up succeeded but user data is unavailable.");
      }

      const { data: existingUser, error: existingUserError } = await supabase
        .from("guest_users")
        .select("*")
        .eq("email", authUser.email)
        .maybeSingle();

      if (existingUserError) throw existingUserError;

      if (existingUser) {
        const { data: updatedUser, error: updateError } = await supabase
          .from("guest_users")
          .update({
            phone: data.phone || existingUser.phone || null,
            first_name: data.firstName,
            last_name: data.lastName,
            auth_method: "email",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return this.mapGuestUser(updatedUser);
      }

      const { data: newUser, error: insertError } = await supabase
        .from("guest_users")
        .insert({
          email: authUser.email,
          phone: data.phone || null,
          first_name: data.firstName,
          last_name: data.lastName,
          auth_method: "email",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return this.mapGuestUser(newUser);
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  },

  // Login with email/password
  async loginWithEmail(data: {
    email: string;
    password: string;
  }): Promise<GuestUser> {
    try {
      if (!data.email || !data.password) {
        throw new Error("Please enter email and password");
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        const message = signInError.message.toLowerCase();
        if (message.includes("invalid login credentials")) {
          throw new Error("Invalid email or password");
        }
        throw signInError;
      }

      const authUser = authData.user;
      if (!authUser?.email) {
        throw new Error("Login succeeded but user data is unavailable.");
      }

      const { data: user, error } = await supabase
        .from("guest_users")
        .select("*")
        .eq("email", authUser.email)
        .maybeSingle();

      if (error) throw error;

      if (user) {
        await supabase
          .from("guest_users")
          .update({
            updated_at: new Date().toISOString(),
            auth_method: "email",
          })
          .eq("id", user.id);

        return this.mapGuestUser(user);
      }

      const firstName = authUser.user_metadata?.first_name || "Guest";
      const lastName = authUser.user_metadata?.last_name || "User";
      const phone = authUser.user_metadata?.phone || null;

      const { data: newUser, error: insertError } = await supabase
        .from("guest_users")
        .insert({
          email: authUser.email,
          phone,
          first_name: firstName,
          last_name: lastName,
          auth_method: "email",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return this.mapGuestUser(newUser);
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  },

  // Google OAuth - Sign in with Supabase provider
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/guest-auth/callback`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  },

  // Handle Google OAuth callback and create/get guest user
  async handleGoogleCallback(): Promise<GuestUser | null> {
    try {
      // Get current auth session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        console.error("No session found");
        return null;
      }

      const googleUser = session.user;

      // Check if guest user already exists
      const { data: existingUser } = await supabase
        .from("guest_users")
        .select("*")
        .eq("email", googleUser.email)
        .maybeSingle();

      if (existingUser) {
        // Update last login
        await supabase
          .from("guest_users")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("email", googleUser.email);

        return this.mapGuestUser(existingUser);
      }

      // Create new guest user from Google
      const firstName = googleUser.user_metadata?.name?.split(" ")[0] || "Guest";
      const lastName = googleUser.user_metadata?.name?.split(" ").slice(1).join(" ") || "User";

      const { data: newUser, error: insertError } = await supabase
        .from("guest_users")
        .insert({
          email: googleUser.email,
          first_name: firstName,
          last_name: lastName,
          auth_method: "google",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return this.mapGuestUser(newUser);
    } catch (error) {
      console.error("Error handling Google callback:", error);
      return null;
    }
  },

  // Get guest user by email
  async getGuestUser(email: string): Promise<GuestUser | null> {
    try {
      const { data, error } = await supabase
        .from("guest_users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapGuestUser(data);
    } catch (error) {
      console.error("Error getting guest user:", error);
      return null;
    }
  },

  // Store guest session in localStorage
  setGuestSession(user: GuestUser) {
    try {
      localStorage.setItem(
        "guest_session",
        JSON.stringify({
          user,
          createdAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Error setting guest session:", error);
    }
  },

  // Get guest session from localStorage
  getGuestSession(): GuestUser | null {
    try {
      const session = localStorage.getItem("guest_session");
      if (!session) return null;
      const parsed = JSON.parse(session);
      return parsed.user;
    } catch (error) {
      console.error("Error getting guest session:", error);
      return null;
    }
  },

  // Clear guest session
  clearGuestSession() {
    try {
      localStorage.removeItem("guest_session");
    } catch (error) {
      console.error("Error clearing guest session:", error);
    }
  },

  // Helper to map database user to GuestUser interface
  mapGuestUser(dbUser: GuestUserRow): GuestUser {
    return {
      id: dbUser.id,
      email: dbUser.email,
      phone: dbUser.phone || undefined,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      createdAt: dbUser.created_at,
      authMethod: dbUser.auth_method,
    };
  },
};
