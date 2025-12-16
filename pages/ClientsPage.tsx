
import React, { useState, useEffect } from 'react';
import { User, ClientType, Client, UserRole, Task, Sale, TaskStatus } from '../types';
import { Search, Plus, Building2, User as UserIcon, Building, X, Save, MapPin, Phone, Lock, Eye, Briefcase, Wallet, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/Toast';

interface ClientsPageProps {
  user: User;
  clients: Client[];
  tasks: Task[]; // Received from App
  sales: Sale[]; // Received from App
  onAddClient: (client: Client) => void;
  targetId?: string; // Optional ID for deep linking
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ user, clients, tasks, sales, onAddClient, targetId }) => {
  const { addToast } = useToast();
  
  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Selected Client for Details View
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'finance'>('info');

  const [formData, setFormData] = useState({
    name: '',
    type: ClientType.COMPANY,
    phone: '',
    address: ''
  });

  // Deep Linking Effect
  useEffect(() => {
      if (targetId) {
          const client = clients.find(c => c.id === targetId);
          if (client) {
              setSelectedClient(client);
          }
      }
  }, [targetId, clients]);

  // Access Control
  if (user.role === UserRole.ENGINEER) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 text-gray-500 dark:text-gray-400">
        <Lock size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2 text-black dark:text-white dark:drop-shadow-md">Доступ ограничен</h2>
        <p>Инженеры не имеют доступа к базе клиентов.</p>
      </div>
    );
  }

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: `c${Date.now()}`,
      name: formData.name,
      type: formData.type,
      phone: formData.phone,
      address: formData.address,
      balance: 0
    };
    
    onAddClient(newClient);
    setIsModalOpen(false);
    setFormData({
      name: '',
      type: ClientType.COMPANY,
      phone: '',
      address: ''
    });
    addToast('Клиент успешно добавлен', 'success');
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          client.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || client.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // --- Helper to get client stats ---
  const getClientStats = (client: Client) => {
      const clientTasks = tasks.filter(t => t.clientId === client.id || t.clientName === client.name);
      const clientSales = sales.filter(s => s.clientName === client.name); // Using name match as ID might be missing in mock data
      const totalSpent = clientSales.reduce((acc, s) => acc + s.amount, 0);
      return { clientTasks, clientSales, totalSpent };
  };

  return (
    <div className="space-y-6 relative">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:drop-shadow-md">Клиентская база</h1>
          <p className="text-gray-500 dark:text-gray-400">Управление контрагентами и объектами</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm dark:shadow-blue-900/20"
        >
          <Plus size={18} />
          <span>Добавить клиента</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Поиск по названию или телефону..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
                />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white transition-colors"
            >
                <option value="ALL">Все типы</option>
                <option value={ClientType.COMPANY}>Юр. лица (ТОО/ИП)</option>
                <option value={ClientType.INDIVIDUAL}>Физ. лица</option>
                <option value={ClientType.GOV}>Гос. учреждения</option>
            </select>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-medium">
                    <tr>
                        <th className="px-6 py-4">Клиент</th>
                        <th className="px-6 py-4">Тип</th>
                        <th className="px-6 py-4">Контакты</th>
                        <th className="px-6 py-4">Адрес</th>
                        <th className="px-6 py-4 text-right">Баланс</th>
                        <th className="px-6 py-4 text-center">Действия</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer" onClick={() => setSelectedClient(client)}>
                            <td className="px-6 py-4">
                                <div className="font-semibold text-gray-900 dark:text-white dark:drop-shadow-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{client.name}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="flex items-center gap-2">
                                    {client.type === ClientType.COMPANY && <Building2 size={16} className="text-blue-500" />}
                                    {client.type === ClientType.INDIVIDUAL && <UserIcon size={16} className="text-green-500" />}
                                    {client.type === ClientType.GOV && <Building size={16} className="text-amber-500" />}
                                    <span className="dark:text-gray-300">{client.type}</span>
                                </span>
                            </td>
                            <td className="px-6 py-4 dark:text-gray-300">{client.phone}</td>
                            <td className="px-6 py-4 max-w-xs truncate dark:text-gray-400">{client.address}</td>
                            <td className={`px-6 py-4 text-right font-medium ${client.balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                {client.balance.toLocaleString()} ₸
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                    className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <Eye size={16} />
                                </button>
                            </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          Клиенты не найдены
                        </td>
                      </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- CLIENT DETAILS MODAL --- */}
      {selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-700 overflow-hidden">
                  
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedClient.name}</h2>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${selectedClient.type === ClientType.COMPANY ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'}`}>
                                  {selectedClient.type}
                              </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1"><Phone size={14}/> {selectedClient.phone}</span>
                              <span className="flex items-center gap-1"><MapPin size={14}/> {selectedClient.address}</span>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                          <div className="text-right">
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Баланс</div>
                              <div className={`text-xl font-bold ${selectedClient.balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {selectedClient.balance.toLocaleString()} ₸
                              </div>
                          </div>
                          <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                              <X size={24} />
                          </button>
                      </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6">
                      {[
                          { id: 'info', label: 'Информация', icon: UserIcon },
                          { id: 'tasks', label: 'История заявок', icon: Briefcase },
                          { id: 'finance', label: 'Финансы', icon: Wallet },
                      ].map(tab => (
                          <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id as any)}
                              className={`flex items-center gap-2 py-4 px-4 border-b-2 text-sm font-bold transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                          >
                              <tab.icon size={16} />
                              {tab.label}
                          </button>
                      ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900/50 p-6">
                      {(() => {
                          const stats = getClientStats(selectedClient);
                          
                          if (activeTab === 'info') {
                              return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Статистика</h3>
                                          <div className="space-y-4">
                                              <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-slate-700">
                                                  <span className="text-gray-500 dark:text-gray-400">Всего заявок</span>
                                                  <span className="font-bold text-gray-900 dark:text-white">{stats.clientTasks.length}</span>
                                              </div>
                                              <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-slate-700">
                                                  <span className="text-gray-500 dark:text-gray-400">В работе</span>
                                                  <span className="font-bold text-blue-600 dark:text-blue-400">{stats.clientTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}</span>
                                              </div>
                                              <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-slate-700">
                                                  <span className="text-gray-500 dark:text-gray-400">LTV (Всего оплат)</span>
                                                  <span className="font-bold text-green-600 dark:text-green-400">{stats.totalSpent.toLocaleString()} ₸</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Быстрые действия</h3>
                                          <div className="flex flex-col gap-3">
                                              <button className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2">
                                                  <Plus size={18} /> Создать новую заявку
                                              </button>
                                              <button className="w-full py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-2">
                                                  <Wallet size={18} /> Принять оплату
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              );
                          }

                          if (activeTab === 'tasks') {
                              return (
                                  <div className="space-y-3">
                                      {stats.clientTasks.length > 0 ? (
                                          stats.clientTasks.map(task => (
                                              <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div className="font-bold text-gray-900 dark:text-white">{task.title}</div>
                                                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                          task.status === TaskStatus.NEW ? 'bg-blue-100 text-blue-700' :
                                                          task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-700' :
                                                          task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                      }`}>
                                                          {task.status}
                                                      </span>
                                                  </div>
                                                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</div>
                                                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                                      <span className="flex items-center gap-1"><Clock size={12} /> {task.deadline}</span>
                                                      <span className="flex items-center gap-1"><MapPin size={12} /> {task.address}</span>
                                                  </div>
                                              </div>
                                          ))
                                      ) : (
                                          <div className="text-center py-10 text-gray-400 dark:text-gray-500">История заявок пуста</div>
                                      )}
                                  </div>
                              );
                          }

                          if (activeTab === 'finance') {
                              return (
                                  <div className="space-y-3">
                                      {stats.clientSales.length > 0 ? (
                                          stats.clientSales.map(sale => (
                                              <div key={sale.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
                                                  <div>
                                                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                          Поступление средств
                                                          {sale.status === 'Paid' && <CheckCircle size={14} className="text-green-500" />}
                                                      </div>
                                                      <div className="text-xs text-gray-500 dark:text-gray-400">{sale.date}</div>
                                                  </div>
                                                  <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                                                      +{sale.amount.toLocaleString()} ₸
                                                  </div>
                                              </div>
                                          ))
                                      ) : (
                                          <div className="text-center py-10 text-gray-400 dark:text-gray-500">Платежей не найдено</div>
                                      )}
                                  </div>
                              );
                          }
                      })()}
                  </div>
              </div>
          </div>
      )}

      {/* CREATE CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Новый клиент</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название / ФИО</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Например: ТОО Ромашка"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип клиента</label>
                <div className="grid grid-cols-3 gap-2">
                  {[ClientType.COMPANY, ClientType.INDIVIDUAL, ClientType.GOV].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type})}
                      className={`py-2 px-1 text-xs sm:text-sm rounded-lg border transition-colors ${
                        formData.type === type 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 font-medium shadow-sm' 
                          : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="+7 (7xx) xxx xx xx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес (основной)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                  <textarea 
                    rows={2}
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Город, Улица, Дом..."
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md dark:shadow-blue-900/30 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
