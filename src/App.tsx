import React, { useState, useEffect } from 'react';
import { LogIn, Plus, X, Edit, Trash2, Filter, Download, Upload, Save, BarChart } from 'lucide-react';
import { format, parse, isAfter } from 'date-fns';
import * as XLSX from 'xlsx';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PPCPEntry {
  id: string;
  oc: string;
  pn: string;
  codigoE: string;
  dataProd: string;
  dataTrat: string;
  dataRetTrat: string;
  dataEntrega: string;
  possuiCD: string;
  numeroCD?: string;
  fichaSeguidora: string;
  status: string;
  prioridade: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [entries, setEntries] = useState<PPCPEntry[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [editingEntry, setEditingEntry] = useState<PPCPEntry | null>(null);
  const [currentEntry, setCurrentEntry] = useState<PPCPEntry>({
    id: '',
    oc: '',
    pn: '',
    codigoE: '',
    dataProd: '',
    dataTrat: '',
    dataRetTrat: '',
    dataEntrega: '',
    possuiCD: 'Não',
    numeroCD: '',
    fichaSeguidora: 'Não',
    status: 'Nesting',
    prioridade: 'Normal'
  });

  const statusOptions = [
    'Nesting',
    'Aguardando chegar materia prima',
    'Em produção',
    'Inspeção para tratador',
    'Em tratamento',
    'Em inspeção final',
    'Em expedição',
    'Concluído'
  ];

  const prioridadeOptions = [
    'Urgencia Máxima',
    'Porca Flange',
    'Cobertura',
    'Normal'
  ];

  useEffect(() => {
    const savedEntries = localStorage.getItem('ppcp_entries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
    const savedAuth = localStorage.getItem('ppcp_auth');
    if (savedAuth) {
      setIsAuthenticated(true);
    }
  }, []);

  const formatDate = (date: string) => {
    if (!date) return '';
    try {
      return format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy');
    } catch {
      return date;
    }
  };

  const parseDate = (date: string) => {
    if (!date) return '';
    try {
      return format(parse(date, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd');
    } catch {
      return date;
    }
  };

  const saveEntries = (newEntries: PPCPEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('ppcp_entries', JSON.stringify(newEntries));
  };

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(entries.map(entry => ({
      ...entry,
      dataProd: formatDate(entry.dataProd),
      dataTrat: formatDate(entry.dataTrat),
      dataRetTrat: formatDate(entry.dataRetTrat),
      dataEntrega: formatDate(entry.dataEntrega),
    })));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PPCP');
    XLSX.writeFile(workbook, 'ppcp_data.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const formattedData = jsonData.map((item: any) => ({
          ...item,
          dataProd: parseDate(item.dataProd),
          dataTrat: parseDate(item.dataTrat),
          dataRetTrat: parseDate(item.dataRetTrat),
          dataEntrega: parseDate(item.dataEntrega),
          id: item.id || Date.now().toString(),
        }));
        saveEntries(formattedData as PPCPEntry[]);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleBackup = () => {
    const backup = {
      entries,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppcp_backup_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string);
          saveEntries(backup.entries);
        } catch (error) {
          alert('Erro ao restaurar backup. Arquivo inválido.');
        }
      };
      reader.readAsText(file);
    }
  };

  const getPriorityChartData = () => {
    const data = prioridadeOptions.map(prioridade => ({
      name: prioridade,
      quantidade: entries.filter(entry => entry.prioridade === prioridade).length
    }));
    return data;
  };

  const getStatusChartData = () => {
    const data = statusOptions.map(status => ({
      name: status,
      quantidade: entries.filter(entry => entry.status === status).length
    }));
    return data;
  };

  const getOverdueEntries = (dateField: keyof PPCPEntry) => {
    const today = new Date();
    return entries
      .filter(entry => {
        const date = parse(entry[dateField] as string, 'yyyy-MM-dd', new Date());
        return isAfter(today, date);
      })
      .map(entry => ({
        name: entry.oc,
        dias: Math.floor((today.getTime() - parse(entry[dateField] as string, 'yyyy-MM-dd', new Date()).getTime()) / (1000 * 60 * 60 * 24))
      }));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'mikrostamp' && password === 'mk0504') {
      setIsAuthenticated(true);
      localStorage.setItem('ppcp_auth', 'true');
      setError('');
    } else {
      setError('Credenciais inválidas');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newEntries;
    if (editingEntry) {
      newEntries = entries.map(entry => 
        entry.id === editingEntry.id ? { ...currentEntry, id: editingEntry.id } : entry
      );
    } else {
      newEntries = [...entries, { ...currentEntry, id: Date.now().toString() }];
    }
    saveEntries(newEntries);
    setShowForm(false);
    setEditingEntry(null);
    setCurrentEntry({
      id: '',
      oc: '',
      pn: '',
      codigoE: '',
      dataProd: '',
      dataTrat: '',
      dataRetTrat: '',
      dataEntrega: '',
      possuiCD: 'Não',
      numeroCD: '',
      fichaSeguidora: 'Não',
      status: 'Nesting',
      prioridade: 'Normal'
    });
  };

  const handleEdit = (entry: PPCPEntry) => {
    setEditingEntry(entry);
    setCurrentEntry(entry);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      const newEntries = entries.filter(entry => entry.id !== id);
      saveEntries(newEntries);
    }
  };

  const getPriorityStyle = (prioridade: string) => {
    switch (prioridade) {
      case 'Urgencia Máxima':
        return 'bg-red-600 text-white';
      case 'Porca Flange':
        return 'bg-pink-200';
      case 'Cobertura':
        return 'bg-pink-100';
      default:
        return 'bg-white';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img 
              src="https://www.mikrostamp.com.br/img/logo-mikrostamp.webp"
              alt="Mikrostamp Logo"
              className="h-16 object-contain"
            />
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Usuário
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 bg-blue-600 py-2 px-4 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <LogIn size={20} />
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Sistema PPCP</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackup}
              className="flex items-center gap-2 bg-green-600 py-2 px-4 text-white rounded-md hover:bg-green-700"
            >
              <Save size={20} />
              Backup
            </button>
            <label className="flex items-center gap-2 bg-yellow-600 py-2 px-4 text-white rounded-md hover:bg-yellow-700 cursor-pointer">
              <Upload size={20} />
              Restaurar
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-indigo-600 py-2 px-4 text-white rounded-md hover:bg-indigo-700"
            >
              <Download size={20} />
              Exportar Excel
            </button>
            <label className="flex items-center gap-2 bg-purple-600 py-2 px-4 text-white rounded-md hover:bg-purple-700 cursor-pointer">
              <Upload size={20} />
              Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center gap-2 bg-blue-600 py-2 px-4 text-white rounded-md hover:bg-blue-700"
            >
              <BarChart size={20} />
              {showCharts ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}
            </button>
          </div>
        </div>

        {showCharts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Prioridade</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={getPriorityChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantidade" fill="#4F46E5" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={getStatusChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantidade" fill="#10B981" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">OCs com Tratamento Atrasado</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={getOverdueEntries('dataTrat')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="dias" fill="#EF4444" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">OCs com Retorno Atrasado</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={getOverdueEntries('dataRetTrat')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="dias" fill="#F59E0B" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">OCs com Entrega Atrasada</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={getOverdueEntries('dataEntrega')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="dias" fill="#6366F1" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="todos">Todos os Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 py-2 px-4 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={20} />
            Adicionar Entrada
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {editingEntry ? 'Editar Entrada PPCP' : 'Nova Entrada PPCP'}
                </h2>
                <button onClick={() => {
                  setShowForm(false);
                  setEditingEntry(null);
                }} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">OC</label>
                  <input
                    type="text"
                    value={currentEntry.oc}
                    onChange={(e) => setCurrentEntry({...currentEntry, oc: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PN</label>
                  <input
                    type="text"
                    value={currentEntry.pn}
                    onChange={(e) => setCurrentEntry({...currentEntry, pn: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código E</label>
                  <input
                    type="text"
                    value={currentEntry.codigoE}
                    onChange={(e) => setCurrentEntry({...currentEntry, codigoE: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nível de Prioridade</label>
                  <select
                    value={currentEntry.prioridade}
                    onChange={(e) => setCurrentEntry({...currentEntry, prioridade: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    {prioridadeOptions.map((prioridade) => (
                      <option key={prioridade} value={prioridade}>{prioridade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Prevista Produção</label>
                  <input
                    type="date"
                    value={currentEntry.dataProd}
                    onChange={(e) => setCurrentEntry({...currentEntry, dataProd: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Prevista Tratamento</label>
                  <input
                    type="date"
                    value={currentEntry.dataTrat}
                    onChange={(e) => setCurrentEntry({...currentEntry, dataTrat: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Prevista Retorno</label>
                  <input
                    type="date"
                    value={currentEntry.dataRetTrat}
                    onChange={(e) => setCurrentEntry({...currentEntry, dataRetTrat: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Prevista Entrega</label>
                  <input
                    type="date"
                    value={currentEntry.dataEntrega}
                    onChange={(e) => setCurrentEntry({...currentEntry, dataEntrega: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Possui CD?</label>
                  <select
                    value={currentEntry.possuiCD}
                    onChange={(e) => setCurrentEntry({...currentEntry, possuiCD: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                {currentEntry.possuiCD === 'Sim' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número CD</label>
                    <input
                      type="text"
                      value={currentEntry.numeroCD}
                      onChange={(e) => setCurrentEntry({...currentEntry, numeroCD: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ficha Seguidora</label>
                  <select
                    value={currentEntry.fichaSeguidora}
                    onChange={(e) => setCurrentEntry({...currentEntry, fichaSeguidora: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={currentEntry.status}
                    onChange={(e) => setCurrentEntry({...currentEntry, status: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    {editingEntry ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código E</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Prod.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Trat.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Ret.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Ent.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº CD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ficha Seg.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries
                .filter(entry => selectedStatus === 'todos' || entry.status === selectedStatus)
                .sort((a, b) => {
                  const prioridadeOrder = {
                    'Urgencia Máxima': 0,
                    'Porca Flange': 1,
                    'Cobertura': 2,
                    'Normal': 3
                  };
                  return prioridadeOrder[a.prioridade as keyof typeof prioridadeOrder] - 
                         prioridadeOrder[b.prioridade as keyof typeof prioridadeOrder];
                })
                .map((entry) => (
                  <tr key={entry.id} className={getPriorityStyle(entry.prioridade)}>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.oc}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.pn}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.codigoE}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.prioridade}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(entry.dataProd)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(entry.dataTrat)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(entry.dataRetTrat)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(entry.dataEntrega)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.possuiCD}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.numeroCD}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.fichaSeguidora}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;