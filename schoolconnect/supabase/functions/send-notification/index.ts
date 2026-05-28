import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { type, title, body, school_id, class_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let tokens: string[] = [];

    if (class_id) {
      // Get all students in this class
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', class_id);

      if (students && students.length > 0) {
        const studentIds = students.map((s: any) => s.id);

        // Get parent IDs linked to these students
        const { data: links } = await supabase
          .from('parent_students')
          .select('parent_id')
          .in('student_id', studentIds);

        if (links && links.length > 0) {
          const parentIds = [...new Set(links.map((l: any) => l.parent_id))];

          // Get Expo push tokens for these parents
          const { data: parents } = await supabase
            .from('profiles')
            .select('fcm_token')
            .in('id', parentIds)
            .not('fcm_token', 'is', null);

          tokens = (parents || [])
            .map((p: any) => p.fcm_token)
            .filter((t: string) => t && t.startsWith('ExponentPushToken'));
        }
      }
    } else if (school_id) {
      // School-wide: get all parent tokens in the school
      const { data: parents } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('school_id', school_id)
        .eq('role', 'parent')
        .not('fcm_token', 'is', null);

      tokens = (parents || [])
        .map((p: any) => p.fcm_token)
        .filter((t: string) => t && t.startsWith('ExponentPushToken'));
    }

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send via Expo Push API (batches of 100)
    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      data: { type },
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    }

    return new Response(JSON.stringify({ ok: true, sent: tokens.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
