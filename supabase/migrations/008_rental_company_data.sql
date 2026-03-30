-- Coluna de dados/registros mensais na tabela de empresas de locação
ALTER TABLE rental_companies ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
-- data.records = [{month: '2025-01', count: 2, total: 4500, notes: '...'}]
