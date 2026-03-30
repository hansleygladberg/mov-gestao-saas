-- Adiciona coluna de configurações da empresa (listas customizáveis pelo admin)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Valor padrão para empresas existentes que não tenham settings ainda
UPDATE companies
SET settings = '{
  "captacoes": ["Tráfego", "Site", "Google", "Indicação"],
  "tiposProjeto": ["Corporativo", "Evento", "Institucional", "Casamento", "Publicitário", "Redes Sociais", "Documentário", "Making Of", "Drone"],
  "segmentos": ["Saúde", "Advocacia", "Educação", "Eventos", "Governo", "Corporativo", "Casamento", "Gastronomia", "Fitness", "Outro"],
  "categoriasFinanceiras": ["Projeto", "Equipamento", "Freelancer", "Software", "Transporte", "Alimentação", "Estacionamento", "Aluguel Equipamento", "Marketing", "Outro"]
}'::jsonb
WHERE settings = '{}'::jsonb OR settings IS NULL;
