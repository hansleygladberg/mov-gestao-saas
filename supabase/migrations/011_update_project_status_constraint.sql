-- Update projects status CHECK constraint to include new pipeline statuses
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'orcamento',
    'orcamento_desaprovado',
    'producao',
    'edicao',
    'aguardando_cliente',
    'revisao',
    'aprovado',
    'finalizado',
    'entregue',
    'pausado'
  ));
