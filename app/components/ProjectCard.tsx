'use client'

import { Project } from '@/lib/types'

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  orcamento: { bg: 'bg-blue-100', text: 'text-blue-800', label: '⏳ Orçamento' },
  orcamento_desaprovado: { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Desaprovado' },
  producao: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '🎬 Produção' },
  edicao: { bg: 'bg-purple-100', text: 'text-purple-800', label: '✂️ Edição' },
  entregue: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Entregue' },
  pausado: { bg: 'bg-gray-100', text: 'text-gray-800', label: '⏸ Pausado' },
}

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const status = STATUS_COLORS[project.status] || STATUS_COLORS.orcamento
  const deliveryDate = project.delivery_date
    ? new Date(project.delivery_date).toLocaleDateString('pt-BR')
    : '-'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{project.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{project.type}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Valor:</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            R$ {project.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Entrega:</span>
          <span className="text-slate-900 dark:text-white">{deliveryDate}</span>
        </div>
      </div>

      {project.progress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">Progresso</span>
            <span className="text-slate-900 dark:text-white">{project.progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      {project.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(project)}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition"
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
