-- Fix profiles table — update with correct Google metadata keys
-- Run in Supabase SQL Editor

UPDATE public.profiles p
SET
  full_name = COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    p.full_name
  ),
  avatar_url = COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture',
    p.avatar_url
  ),
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id;

-- Verify
SELECT id, email, full_name, avatar_url FROM public.profiles;
