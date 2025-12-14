
import React, { useState } from 'react';
import { User, ClientType, Client, UserRole } from '../types';
import { Search, Plus, Building2, User as UserIcon, Building, X, Save, MapPin, Phone, Lock } from 'lucide-react';

interface ClientsPageProps {
  user: User;
  clients: Client[];
  onAddClient: (client: Client) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ user, clients, onAddClient }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    name: '',
    type: ClientType.COMPANY,
    phone: '',
    address: ''
  });

  // Access Control
  if (user.role === UserRole.ENGINEER) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 text-gray-500 dark:text-gray-400">
        <Lock size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2 text-black dark:text-white">Доступ ограничен</h2>
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
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          client.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || client.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 relative">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Клиентская база</h1>
          <p className="text-gray-500 dark:text-gray-400">Управление контрагентами и объектами</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Добавить клиента</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Поиск по названию или телефону..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white"
            >
                <option value="ALL">Все типы</option>
                <option value={ClientType.COMPANY}>Юр. лица (ТОО/ИП)</option>
                <option value={ClientType.INDIVIDUAL}>Физ. лица</option>
                <option value={ClientType.GOV}>Гос. учреждения</option>
            </select>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-700 dark:text-gray-400 font-medium">
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
                        <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-semibold text-gray-900 dark:text-white">{client.name}</div>
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
                                <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">Детали</button>
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

      {/* CREATE CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Новый клиент</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
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
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 font-medium' 
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
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
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
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-medium transition-colors flex items-center justify-center gap-2"
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
