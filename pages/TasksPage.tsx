
import React, { useState } from 'react';
import { User, UserRole, Task, TaskStatus, Client, ClientType } from '../types';
import { USERS } from '../mockData';
import { MapPin, Calendar, Clock, Filter, Plus, Camera, CheckSquare, Users as UsersIcon, X, Save, Upload, UserPlus, List, Phone, Building, Building2, User as UserIcon } from 'lucide-react';

interface TasksPageProps {
  user: User;
  clients: Client[];
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onAddClient?: (client: Client) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ user, clients, tasks, onUpdateTasks, onAddClient }) => {
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTaskForReport, setActiveTaskForReport] = useState<string | null>(null);

  // Form state for new task
  const [isManualClient, setIsManualClient] = useState(true); // Default to true
  const [manualClientName, setManualClientName] = useState('');
  
  const [newTask, setNewTask] = useState({
    title: '',
    clientId: '',
    address: '',
    deadline: new Date().toISOString().split('T')[0], // Default to today
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    description: '',
    engineerId: ''
  });

  // Client Creation Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientFormData, setNewClientFormData] = useState({
    name: '',
    type: ClientType.COMPANY,
    phone: '',
    address: ''
  });

  // Form state for report
  const [reportComment, setReportComment] = useState('');

  const filteredTasks = tasks.filter(task => {
    if (filter !== 'ALL' && task.status !== filter) return false;
    if (user.role === UserRole.ENGINEER) {
      return task.engineerId === user.id || !task.engineerId;
    }
    return true;
  });

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === TaskStatus.COMPLETED) {
      // Open report modal instead of immediate completion
      setActiveTaskForReport(taskId);
      setIsReportModalOpen(true);
    } else {
      onUpdateTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  // --- HANDLER: CREATE NEW CLIENT ---
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: `c${Date.now()}`,
      name: newClientFormData.name,
      type: newClientFormData.type,
      phone: newClientFormData.phone,
      address: newClientFormData.address,
      balance: 0
    };
    
    if (onAddClient) {
        onAddClient(newClient);
    }

    // Auto-select in task form
    setIsManualClient(false);
    setNewTask(prev => ({ 
        ...prev, 
        clientId: newClient.id, 
        address: newClient.address || prev.address 
    }));

    // Close modal and reset form
    setIsClientModalOpen(false);
    setNewClientFormData({
        name: '',
        type: ClientType.COMPANY,
        phone: '',
        address: ''
    });
  };

  const createTaskLogic = (shouldKeepOpen: boolean) => {
    // Determine client name
    let clientName = 'Неизвестный клиент';
    if (isManualClient) {
      clientName = manualClientName || 'Без названия';
    } else {
      const client = clients.find(c => c.id === newTask.clientId);
      if (client) clientName = client.name;
    }

    const createdTask: Task = {
      id: `t${Date.now()}`,
      title: newTask.title,
      clientName: clientName,
      address: newTask.address,
      deadline: newTask.deadline,
      status: TaskStatus.NEW,
      priority: newTask.priority,
      description: newTask.description,
      engineerId: newTask.engineerId || undefined
    };

    onUpdateTasks([createdTask, ...tasks]);

    if (shouldKeepOpen) {
      // Reset only task-specific fields, keep context (Client, Address, Date, Engineer)
      setNewTask(prev => ({
        ...prev,
        title: '',
        description: ''
      }));
    } else {
      setIsCreateModalOpen(false);
      resetForm();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskLogic(false);
  };

  const handleSaveAndCreateAnother = (e: React.MouseEvent) => {
    e.preventDefault();
    // Manual validation check
    const form = e.currentTarget.closest('form');
    if (form && form.checkValidity()) {
        createTaskLogic(true);
    } else {
        form?.reportValidity();
    }
  };

  const resetForm = () => {
    setNewTask({
      title: '',
      clientId: '',
      address: '',
      deadline: new Date().toISOString().split('T')[0],
      priority: 'Medium',
      description: '',
      engineerId: ''
    });
    setIsManualClient(true); // Reset to Manual by default
    setManualClientName('');
  };

  const handleCompleteTask = () => {
    if (!activeTaskForReport) return;
    
    onUpdateTasks(tasks.map(t => 
      t.id === activeTaskForReport 
        ? { ...t, status: TaskStatus.COMPLETED, description: `${t.description} \n\n[ОТЧЕТ ИНЖЕНЕРА]: ${reportComment}` } 
        : t
    ));
    
    setIsReportModalOpen(false);
    setActiveTaskForReport(null);
    setReportComment('');
  };

  const getStatusColor = (status: TaskStatus) => {
    switch(status) {
      case TaskStatus.NEW: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case TaskStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case TaskStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case TaskStatus.CANCELED: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Заявки на работы</h1>
          <p className="text-gray-500 dark:text-gray-400">Монтаж, ремонт и обслуживание</p>
        </div>
        
        {user.role !== UserRole.ENGINEER && (
          <button 
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-blue-500/30"
          >
            <Plus size={18} />
            <span>Создать заявку</span>
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['ALL', TaskStatus.NEW, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
              filter === status 
                ? 'bg-slate-800 dark:bg-white text-white dark:text-black border-slate-800 dark:border-white shadow-sm' 
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {status === 'ALL' ? 'Все' : status === TaskStatus.NEW ? 'Новые' : status === TaskStatus.IN_PROGRESS ? 'В работе' : 'Завершенные'}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTasks.map(task => (
          <div key={task.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                {task.priority === 'High' && (
                  <span className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                    <Clock size={12} />
                    Срочно
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 dark:drop-shadow-sm">{task.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
                 <MapPin size={14} />
                 {task.address}
              </p>
              
              <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-200 mb-4 whitespace-pre-wrap border border-gray-100 dark:border-slate-600/50">
                {task.description}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto">
                <div className="flex items-center gap-1">
                  <UsersIcon size={14} />
                  <span className="truncate max-w-[120px]" title={task.clientName}>{task.clientName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{task.deadline}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 rounded-b-xl flex gap-3">
              {user.role === UserRole.ENGINEER && task.status === TaskStatus.NEW && (
                <button 
                  onClick={() => handleStatusChange(task.id, TaskStatus.IN_PROGRESS)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg font-medium hover:opacity-90 text-sm shadow-md shadow-blue-500/20"
                >
                  Принять в работу
                </button>
              )}
              
              {user.role === UserRole.ENGINEER && task.status === TaskStatus.IN_PROGRESS && (
                <button 
                  onClick={() => handleStatusChange(task.id, TaskStatus.COMPLETED)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg font-medium hover:opacity-90 text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <CheckSquare size={16} />
                  Завершить работу
                </button>
              )}

              {task.status === TaskStatus.COMPLETED && (
                <div className="w-full text-center text-green-600 dark:text-green-400 font-medium text-sm py-2 flex items-center justify-center gap-2">
                  <CheckSquare size={16} />
                  Работа выполнена
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- CREATE TASK MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Новая заявка</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название задачи</label>
                <input 
                  required
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Например: Монтаж GPS на Камаз"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Клиент</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsManualClient(!isManualClient);
                        if (!isManualClient) {
                            // Switching TO manual
                            setNewTask(prev => ({ ...prev, clientId: '', address: '' }));
                            setManualClientName('');
                        }
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      {isManualClient ? <List size={12}/> : <UserPlus size={12}/>}
                      {isManualClient ? 'Выбрать из списка' : 'Ввести вручную'}
                    </button>
                  </div>
                  
                  {isManualClient ? (
                    <input 
                      required
                      type="text" 
                      value={manualClientName}
                      onChange={e => setManualClientName(e.target.value)}
                      placeholder="Имя клиента..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  ) : (
                    <select 
                      required={!isManualClient}
                      value={newTask.clientId}
                      onChange={e => {
                          const val = e.target.value;
                          if (val === 'NEW') {
                            setIsClientModalOpen(true);
                          } else {
                            const client = clients.find(c => c.id === val);
                            setNewTask({...newTask, clientId: val, address: client?.address || ''});
                          }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    >
                      <option value="">Выберите клиента</option>
                      <option value="NEW" className="font-bold text-blue-600 dark:text-blue-400">+ Создать нового клиента</option>
                      <optgroup label="Существующие клиенты">
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                    </select>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Приоритет</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="Low">Низкий</option>
                    <option value="Medium">Средний</option>
                    <option value="High">Высокий</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес объекта</label>
                <input 
                  required
                  type="text" 
                  value={newTask.address}
                  onChange={e => setNewTask({...newTask, address: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={isManualClient ? "Введите адрес..." : "Заполнится автоматически или введите..."}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Срок (Дедлайн)</label>
                  <input 
                    required
                    type="date" 
                    value={newTask.deadline}
                    onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Исполнитель</label>
                  <select 
                    value={newTask.engineerId}
                    onChange={e => setNewTask({...newTask, engineerId: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Не назначен</option>
                    {USERS.filter(u => u.role === UserRole.ENGINEER).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание работ</label>
                <textarea 
                  required
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Что именно нужно сделать..."
                />
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-100 dark:border-slate-700 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                
                <button 
                  type="button"
                  onClick={handleSaveAndCreateAnother}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium transition-colors flex items-center gap-2 justify-center"
                >
                  <Plus size={18} />
                  <span>Сохранить +</span>
                </button>

                <button 
                  type="submit" 
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 shadow-md shadow-blue-500/20 font-medium transition-colors"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REPORT & COMPLETE MODAL --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
             <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-green-50 dark:bg-green-900/20">
                <h2 className="text-lg font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                    <CheckSquare size={20} />
                    Завершение работы
                </h2>
                <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
             </div>
             
             <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Отчет о проделанной работе</label>
                    <textarea 
                        autoFocus
                        rows={4}
                        value={reportComment}
                        onChange={e => setReportComment(e.target.value)}
                        placeholder="Опишите, что было сделано, какие материалы использованы..."
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Фотоотчет</label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer">
                        <Camera size={32} className="mb-2" />
                        <span className="text-sm">Нажмите, чтобы добавить фото</span>
                    </div>
                </div>
                
                <div className="pt-2">
                    <button 
                        onClick={handleCompleteTask}
                        disabled={!reportComment.trim()}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-md shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        Отправить отчет и закрыть
                    </button>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* --- CREATE CLIENT MODAL (SHARED) --- */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Новый клиент</h2>
              <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              {/* ... form fields ... */}
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 shadow-md shadow-blue-500/20 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
