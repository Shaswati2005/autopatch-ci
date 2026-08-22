-- Supabase PostgreSQL Schema for AutoPatch-CI
-- Execute this script in your Supabase SQL Editor (Dashboard -> SQL Editor)

-- 1. Users Table (Stores authenticated GitHub users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    github_username TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    org TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Repositories Table (Connected GitHub repositories protected by AutoPatch-CI)
CREATE TABLE IF NOT EXISTS public.repositories (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    repo_name TEXT NOT NULL UNIQUE,
    default_branch TEXT NOT NULL DEFAULT 'main',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    webhook_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Diagnostic Runs Table (CI failure events and repair metadata)
CREATE TABLE IF NOT EXISTS public.diagnostic_runs (
    run_id TEXT PRIMARY KEY,
    repo TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    commit_sha TEXT NOT NULL,
    workflow_name TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, INGESTED, DIAGNOSING, VERIFYING, PR_CREATED, FAILED
    pr_number INT,
    pr_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Diagnostic Trace Steps Table (Sequential reasoning telemetry emitted during healing)
CREATE TABLE IF NOT EXISTS public.diagnostic_trace_steps (
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES public.diagnostic_runs(run_id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_trace_steps_run_id ON public.diagnostic_trace_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_runs_repo ON public.diagnostic_runs(repo);
CREATE INDEX IF NOT EXISTS idx_diagnostic_runs_status ON public.diagnostic_runs(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_trace_steps ENABLE ROW LEVEL SECURITY;

-- Allow public read on diagnostic runs & traces for dashboard telemetry
CREATE POLICY "Public Read Diagnostic Runs" ON public.diagnostic_runs FOR SELECT USING (true);
CREATE POLICY "Public Read Diagnostic Steps" ON public.diagnostic_trace_steps FOR SELECT USING (true);
CREATE POLICY "Service Role Full Access Runs" ON public.diagnostic_runs FOR ALL USING (true);
CREATE POLICY "Service Role Full Access Steps" ON public.diagnostic_trace_steps FOR ALL USING (true);
