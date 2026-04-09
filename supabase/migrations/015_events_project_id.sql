-- Adiciona project_id na tabela events para sincronização
ALTER TABLE events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Corrige constraint para incluir 'reuniao'
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('capt', 'entrega', 'fixo', 'manual', 'reuniao'));

CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
