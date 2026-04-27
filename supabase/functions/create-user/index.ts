import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

interface CreateUserRequest {
  email: string;
  password: string;
  role: "admin" | "staff";
}

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  // Authentication check - require valid JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Non autorisé - En-tête Authorization manquant' }), 
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Verify the JWT token by getting the user
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Non autorisé - Token invalide' }), 
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  
  // Use service role key for admin operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Check caller has admin role
  const { data: callerRole, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (roleError || !callerRole || callerRole.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Interdit - Seuls les administrateurs peuvent créer des utilisateurs' }), 
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { email, password, role }: CreateUserRequest = await req.json();

    // Validate input
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, mot de passe et rôle sont requis' }), 
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!['admin', 'staff'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Rôle invalide. Doit être "admin" ou "staff"' }), 
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 8 caractères' }), 
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }), 
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Assign role to the new user
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role
      });

    if (roleInsertError) {
      console.error("Error assigning role:", roleInsertError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'attribution du rôle' }), 
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`User created: ${email} with role ${role} by admin ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email,
          role: role 
        } 
      }), 
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
