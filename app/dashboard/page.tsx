export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-400">Bem-vindo ao MOV Gestão! 🎬</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Projetos</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Clientes</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Entradas</h3>
          <p className="text-3xl font-bold mt-2">R$ 0</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Saídas</h3>
          <p className="text-3xl font-bold mt-2">R$ 0</p>
        </div>
      </div>
    </div>
  )
}
