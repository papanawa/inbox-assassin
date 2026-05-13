-- Add updated_at to profiles if not exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
