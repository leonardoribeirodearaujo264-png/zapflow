-- =============================================
-- ZapFlow — Migration: adicionar workspace_id em conversations
-- Execute APENAS se já rodou o supabase-schema.sql antes
-- =============================================

-- Adicionar coluna workspace_id na tabela conversations (caso não exista)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Preencher workspace_id nas conversas existentes (via instância)
UPDATE conversations c
SET workspace_id = i.workspace_id
FROM instances i
WHERE c.instance_id = i.id
  AND c.workspace_id IS NULL;

-- Remover policy antiga e criar a nova (mais simples)
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;

CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_instances_workspace_id ON instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
