-- ZapFlow Database Schema
-- Run this in your Supabase SQL Editor

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Instances
CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  base_url TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  phone_number TEXT,
  profile_name TEXT,
  profile_picture_url TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1024,
  is_active BOOLEAN DEFAULT true,
  trigger_keywords TEXT[],
  trigger_all_messages BOOLEAN DEFAULT false,
  asaas_enabled BOOLEAN DEFAULT false,
  calendar_enabled BOOLEAN DEFAULT false,
  memory_enabled BOOLEAN DEFAULT true,
  memory_window INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  whatsapp_id TEXT,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  is_ai_response BOOLEAN DEFAULT false,
  provider TEXT,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asaas Customers
CREATE TABLE IF NOT EXISTS asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  asaas_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asaas Payments
CREATE TABLE IF NOT EXISTS asaas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES asaas_customers(id),
  asaas_id TEXT UNIQUE NOT NULL,
  billing_type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  description TEXT,
  invoice_url TEXT,
  pix_qr_code TEXT,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees JSONB,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Google OAuth Tokens
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asaas Settings
CREATE TABLE IF NOT EXISTS asaas_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  sandbox_mode BOOLEAN DEFAULT false,
  webhook_secret TEXT,
  notify_payment_whatsapp BOOLEAN DEFAULT true,
  notify_instance_id UUID REFERENCES instances(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Provider Settings
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can manage own workspaces" ON workspaces
  FOR ALL USING (owner_id = auth.uid());

-- Helper function to get user's workspace IDs
CREATE OR REPLACE FUNCTION get_user_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM workspaces WHERE owner_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Instances policies
CREATE POLICY "Users can manage own instances" ON instances
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Agents policies
CREATE POLICY "Users can manage own agents" ON agents
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Conversations policies
CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Messages policies
CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL USING (conversation_id IN (SELECT id FROM conversations WHERE instance_id IN (SELECT id FROM instances WHERE workspace_id IN (SELECT get_user_workspace_ids()))));

-- Asaas Customers policies
CREATE POLICY "Users can manage own asaas customers" ON asaas_customers
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Asaas Payments policies
CREATE POLICY "Users can manage own asaas payments" ON asaas_payments
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Calendar Events policies
CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Google OAuth policies
CREATE POLICY "Users can manage own google tokens" ON google_oauth_tokens
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Asaas Settings policies
CREATE POLICY "Users can manage own asaas settings" ON asaas_settings
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- AI Provider Settings policies
CREATE POLICY "Users can manage own ai settings" ON ai_provider_settings
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Service role bypass (for webhooks)
CREATE POLICY "Service role bypass instances" ON instances
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass conversations" ON conversations
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass messages" ON messages
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass agents" ON agents
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass payments" ON asaas_payments
  FOR ALL TO service_role USING (true);
