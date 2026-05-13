-- Migration: Scheduled Runs
-- Run in Supabase SQL Editor

-- Add auto-run flag to rules
ALTER TABLE public.rules
  ADD COLUMN IF NOT EXISTS is_auto boolean DEFAULT false;

-- User settings table (schedule config per user)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  auto_run_enabled boolean DEFAULT false,
  auto_run_frequency text DEFAULT 'weekly'
    CHECK (auto_run_frequency IN ('daily', 'weekly')),
  auto_run_hour integer DEFAULT 9 CHECK (auto_run_hour BETWEEN 0 AND 23),
  auto_run_day integer DEFAULT 1 CHECK (auto_run_day BETWEEN 0 AND 6), -- 0=Sun, 1=Mon...
  last_auto_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON public.user_settings FOR ALL USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Updated_at trigger for user_settings
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
