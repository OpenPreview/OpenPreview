import { createClient } from '@openpreview/db/server';
import { Tables } from '@openpreview/supabase';
import { redirect } from 'next/navigation';

export async function useUser() {
  const supabase = createClient();

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      redirect('/login');
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) throw error;

    return { user: userData, supabase };
  } catch (error) {
    console.error('Error fetching user:', error);
    redirect('/login');
  }
}
