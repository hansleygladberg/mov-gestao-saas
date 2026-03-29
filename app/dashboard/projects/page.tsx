'use client'

import { useEffect, useState } from 'react'
import { Project } from '@/lib/types'
import { ProjectCard } from '@/app/components/ProjectCard'
import { ProjectForm } from '@/app/components/ProjectForm'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateProject(data: Partial<Project>) {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await loadProjects()
        setShowForm(false)
        alert('Projeto criado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
    }
  }

  async function handleUpdateProject(data: Partial<Project>) {
    if (!editingProject) return

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await loadProjects()
        setEditingProject(null)
        alert('Projeto atualizado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error)
    }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return

    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' })

      if (response.ok) {
        await loadProjects()
        alert('Projeto excluído com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao excluir projeto:', error)
    }
  }

  const filteredProjects = projects.filter(
    (p) => !filter || p.status === filter
  )

  const stats = {
    total: projects.length,
    orcamento: projects.filter((p) => p.status === 'orcamento').length,
    producao: projects.filter((p) => p.status === 'producao').length,
    entregue: projects.filter((p) => p.status === 'entregue').length,
  }

  if (loading) {
    return <div className="text-slate-400">Carregando projetos...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Projetos</h2>
        <button
          onClick={() => {
            setEditingProject(null)
            setShowForm(!showForm)
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          + Novo Projeto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total</p>
          <p className="text-3xl font-bold text-blue-400">{stats.total}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Orçamento</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.orcamento}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Em Produção</p>
          <p className="text-3xl font-bold text-purple-400">{stats.producao}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Entregues</p>
          <p className="text-3xl font-bold text-green-400">{stats.entregue}</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">Criar Novo Projeto</h3>
          <ProjectForm
            onSubmit={handleCreateProject}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {editingProject && (
        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">Editar Projeto</h3>
          <ProjectForm
            project={editingProject}
            onSubmit={handleUpdateProject}
            onCancel={() => setEditingProject(null)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              !filter
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFilter('orcamento')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'orcamento'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Orçamento ({stats.orcamento})
          </button>
          <button
            onClick={() => setFilter('producao')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'producao'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Produção ({stats.producao})
          </button>
          <button
            onClick={() => setFilter('entregue')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'entregue'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Entregues ({stats.entregue})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={(p) => {
                setEditingProject(p)
                setShowForm(false)
              }}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">Nenhum projeto encontrado</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Criar primeiro projeto
          </button>
        </div>
      )}
    </div>
  )
}
