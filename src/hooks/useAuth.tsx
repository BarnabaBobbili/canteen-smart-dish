import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: string, canteenId?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUpWithInvitation: (token: string, fullName: string, password: string) => Promise<{ error: any | null }>;
  fetchUserProfile: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const handleAuthChange = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    // Check for existing session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleAuthChange(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select(`*, canteens (id, name, address)`)
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() to prevent error on 0 rows

      if (fetchError && fetchError.code !== 'PGRST116') { // Ignore '0 rows' error
        throw fetchError;
      }

      if (profileData) {
        setProfile(profileData);
      } else {
        // Profile doesn't exist, let's create one, especially for OAuth users
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) {
          throw userError || new Error('User not found');
        }

        const newProfile = {
          user_id: user.user.id,
          email: user.user.email || '',
          full_name: user.user.user_metadata.full_name || 'New User',
          role: 'owner' as const, // New users default to owner
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setProfile(createdProfile);
      }
    } catch (error) {
      console.error('Error fetching or creating profile:', error);
      setProfile(null); // Ensure profile is null on error
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message,
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string, canteenId?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        }
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
      return { error };
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: data.user.id,
            email: email,
            full_name: fullName,
            role: role as any,
            canteen_id: canteenId
          }
        ]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      toast({
        title: "Sign Up Successful",
        description: "Please check your email to confirm your account.",
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Google Sign In Failed",
        description: error.message,
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  const signUpWithInvitation = async (token: string, fullName: string, password: string) => {
    // 1. Get invitation details
    const { data: invData, error: invError } = await supabase.rpc('get_invitation_details_by_token', {
      p_token: token,
    });

    if (invError || !invData || invData.length === 0) {
      return { error: { message: 'Invalid or expired invitation token.' } };
    }
    const invitation = invData[0];

    // 2. Sign up the user
    const { error: signUpError } = await signUp(invitation.email, password, fullName, invitation.role, invitation.canteen_id);

    if (signUpError) {
      return { error: signUpError };
    }

    // 3. Mark invitation as accepted
    const { error: acceptError } = await supabase.rpc('mark_invitation_accepted', {
      p_token: token,
    });

    if (acceptError) {
      // Log this error, but don't block the user. The main goal is to get them signed up.
      console.error('Failed to mark invitation as accepted:', acceptError);
    }

    return { error: null };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signUpWithInvitation,
    fetchUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};