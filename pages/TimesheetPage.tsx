
import React, { useState } from 'react';
import { User, UserRole, TimeEntry, AttendanceStatus, Advance } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Save, Edit2, AlertCircle, LayoutGrid, List, FileSpreadsheet, MapPin, Plus, X, UserPlus, Phone, Briefcase, User as UserIcon, Wallet, CreditCard, DollarSign, ChevronDown } from 'lucide-react';
import { useToast } from '../components/Toast';
import { CustomSelect } from '../components/CustomSelect';

interface TimesheetPageProps {
  user: User;
  users: User[];
  timesheetData: TimeEntry[];
  advances: Advance[];
  onUpdateEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (id: string) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onAddAdvance: (advance: Advance) => void;
}

// Removed ViewMode type as we enforce Month view
type Tab = 'timesheet' | 'employees';

export const TimesheetPage: React.FC<TimesheetPageProps> = ({ user, users, timesheetData, advances, onUpdateEntry, onDeleteEntry, onAddUser, onUpdateUser, onAddAdvance }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('timesheet');
  // Enforce monthly view by removing viewMode state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  // User Modal State (Create & Edit)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    role: UserRole.ENGINEER,
    position: '',
    phone: '',
    salary: ''
  });

  // Add Advance Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [newAdvanceForm, setNewAdvanceForm] = useState({
    userId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    comment: ''
  });

  // --- Date Helpers ---

  const currentDateObj = new Date(selectedDate);

  const changeDate = (amount: number) => {
    const date = new Date(selectedDate);
    // Always change by month
    date.setMonth(date.getMonth() + amount);
    setSelectedDate(date.toISOString().split('T')[0]);
    setEditingEntry(null);
  };

  const getHeaderDateLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return new Date(selectedDate).toLocaleDateString('ru-RU', options);
  };

  // --- Data Logic ---

  const getEntryForUser = (targetUserId: string, dateStr: string) => {
    return timesheetData.find(t => t.userId === targetUserId && t.date === dateStr);
  };

  // --- Visibility Filter ---
  const visibleUsers = user.role === UserRole.ENGINEER 
    ? users.filter(u => u.id === user.id) 
    : users;

  // --- User Handlers (Add & Edit) ---

  const openAddUserModal = () => {
    setEditingUser(null);
    setUserForm({ name: '', role: UserRole.ENGINEER, position: '', phone: '', salary: '' });
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (targetUser: User) => {
    setEditingUser(targetUser);
    setUserForm({
      name: targetUser.name,
      role: targetUser.role,
      position: targetUser.position || '',
      phone: targetUser.phone || '',
      salary: targetUser.salary.toString()
    });
    setIsUserModalOpen(true);
  };

  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salaryValue = parseInt(userForm.salary) || 0;
    
    if (editingUser) {
      // Update existing
      const updatedUser: User = {
        ...editingUser,
        name: userForm.name,
        role: userForm.role,
        position: userForm.position,
        phone: userForm.phone,
        salary: salaryValue
      };
      onUpdateUser(updatedUser);
      addToast('Данные сотрудника обновлены', 'success');
    } else {
      // Create new
      const newUser: User = {
          id: `u${Date.now()}`,
          name: userForm.name,
          role: userForm.role,
          position: userForm.position,
          phone: userForm.phone,
          avatar: `https://picsum.photos/100/100?random=${Date.now()}`,
          salary: salaryValue
      };
      onAddUser(newUser);
      addToast('Сотрудник добавлен', 'success');
    }
    
    setIsUserModalOpen(false);
  };

  // --- Advance Handlers ---
  
  const openAdvanceModal = (targetUserId?: string) => {
      setNewAdvanceForm({ 
          userId: targetUserId || '', 
          amount: '', 
          date: new Date().toISOString().split('T')[0], 
          comment: '' 
      });
      setIsAdvanceModalOpen(true);
  };

  const handleAddAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvanceForm.userId) return;
    
    const advance: Advance = {
        id: `adv${Date.now()}`,
        userId: newAdvanceForm.userId,
        amount: parseInt(newAdvanceForm.amount) || 0,
        date: newAdvanceForm.date,
        comment: newAdvanceForm.comment
    };
    onAddAdvance(advance);
    setIsAdvanceModalOpen(false);
    addToast('Аванс выдан', 'success');
  };

  // --- Edit Handlers (Timesheet) ---

  const updateEntry = (existingEntry: TimeEntry | undefined, userId: string, dateStr: string, status: AttendanceStatus | null) => {
     if (status === null) {
         if (existingEntry) {
             onDeleteEntry(existingEntry.id);
         }
         return;
     }

     let hours = 0;
     if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) hours = 8;

     if (existingEntry) {
      onUpdateEntry({ ...existingEntry, status: status, totalHours: hours });
    } else {
      const newEntry: TimeEntry = {
        id: `te_${Date.now()}_${userId}_${dateStr}`,
        userId,
        date: dateStr,
        status: status,
        totalHours: hours,
        checkIn: status === AttendanceStatus.PRESENT ? '09:00' : '',
        checkOut: status === AttendanceStatus.PRESENT ? '18:00' : ''
      };
      onUpdateEntry(newEntry);
    }
  };

  const toggleCellStatus = (userId: string, dateStr: string) => {
      if (user.role === UserRole.ENGINEER) return;

      const entry = getEntryForUser(userId, dateStr);
      let nextStatus: AttendanceStatus | null = AttendanceStatus.PRESENT;

      if (entry) {
          switch (entry.status) {
              case AttendanceStatus.PRESENT: nextStatus = AttendanceStatus.SICK; break;
              case AttendanceStatus.SICK: nextStatus = AttendanceStatus.LEAVE; break;
              case AttendanceStatus.LEAVE: nextStatus = AttendanceStatus.ABSENT; break;
              case AttendanceStatus.ABSENT: nextStatus = null; break; // Clear
              default: nextStatus = AttendanceStatus.PRESENT;
          }
      }
      
      updateEntry(entry, userId, dateStr, nextStatus);
  };

  // --- Render Functions ---

  const renderMonthGrid = () => {
    const year = currentDateObj.getFullYear();
    const month = currentDateObj.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDayLabel = (day: number) => {
        const d = new Date(year, month, day);
        return d.toLocaleDateString('ru-RU', { weekday: 'short' });
    };

    const isWeekend = (day: number) => {
        const d = new Date(year, month, day);
        const dayOfWeek = d.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
    };

    const getCellContent = (status?: AttendanceStatus) => {
        switch(status) {
            case AttendanceStatus.PRESENT: return '8';
            case AttendanceStatus.LATE: return '8*';
            case AttendanceStatus.SICK: return 'Б';
            case AttendanceStatus.LEAVE: return 'О';
            case AttendanceStatus.ABSENT: return 'Н';
            case AttendanceStatus.FIRED: return 'У';
            default: return '';
        }
    };

    const getCellClass = (status?: AttendanceStatus, isWknd?: boolean) => {
        let base = "border-r border-b border-gray-300 dark:border-slate-700 h-8 text-center text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors select-none text-gray-900 dark:text-gray-300";
        if (isWknd) base += " bg-yellow-100 dark:bg-yellow-900/20";
        if (!status) return base;
        switch(status) {
            case AttendanceStatus.SICK: return `${base} bg-yellow-200 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 font-bold`;
            case AttendanceStatus.ABSENT: return `${base} bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200 font-bold`;
            case AttendanceStatus.LEAVE: return `${base} bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold`;
            case AttendanceStatus.FIRED: return `${base} bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-400`;
            default: return base;
        }
    };

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-max">
                <thead>
                    <tr>
                        <th className="border-b border-r border-gray-300 dark:border-slate-700 bg-blue-50 dark:bg-slate-700/50 p-2 text-left min-w-[200px] z-10 sticky left-0 text-blue-900 dark:text-white font-bold">
                            {getHeaderDateLabel()}
                        </th>
                        {daysArray.map(day => (
                            <th key={`h-${day}`} className={`border-b border-r border-gray-300 dark:border-slate-700 p-1 min-w-[30px] text-xs ${isWeekend(day) ? 'bg-yellow-200 dark:bg-yellow-900/30' : 'bg-blue-50 dark:bg-slate-700/50'}`}>
                                <div className="font-bold text-gray-700 dark:text-white">{String(day).padStart(2, '0')}</div>
                                <div className="font-normal text-gray-500 dark:text-gray-300 uppercase text-[10px]">{getDayLabel(day)}</div>
                            </th>
                        ))}
                        <th className="border-b border-l border-gray-300 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 p-2 min-w-[60px] text-xs font-bold text-green-900 dark:text-green-300">
                            Всего
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {visibleUsers.map(u => {
                        let userTotalHours = 0;
                        return (
                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="border-r border-b border-gray-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate w-48">{u.name}</div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-48">{u.position}</div>
                                </td>
                                {daysArray.map(day => {
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const entry = getEntryForUser(u.id, dateStr);
                                    if (entry) userTotalHours += entry.totalHours;
                                    return (
                                        <td key={`${u.id}-${day}`} onClick={() => toggleCellStatus(u.id, dateStr)} className={getCellClass(entry?.status, isWeekend(day))}>
                                            {getCellContent(entry?.status)}
                                        </td>
                                    );
                                })}
                                <td className="border-b border-l border-gray-300 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 text-center text-sm font-bold text-gray-800 dark:text-white">
                                    {userTotalHours}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
            <span className="flex items-center gap-1"><span className="font-bold">8</span> - Присутствие (часов)</span>
            <span className="flex items-center gap-1"><span className="font-bold bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 px-1 rounded">Б</span> - Больничный</span>
            <span className="flex items-center gap-1"><span className="font-bold bg-red-200 dark:bg-red-900/50 dark:text-red-200 px-1 rounded">Н</span> - Прогул/Неявка</span>
            <span className="flex items-center gap-1"><span className="font-bold bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 px-1 rounded">О</span> - Отпуск/Отгул</span>
        </div>
      </div>
    );
  };

  const renderEmployeesList = () => {
      const workDaysNorm = 22;
      return (
        <div className="space-y-4">
             <div className="flex justify-end gap-2">
                {(user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                    <button 
                        onClick={openAddUserModal}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/30 font-bold"
                    >
                        <UserPlus size={18} />
                        <span>Добавить сотрудника</span>
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-medium">
                        <tr>
                            <th className="px-6 py-4">Сотрудник</th>
                            <th className="px-6 py-4 text-right">Оклад (мес.)</th>
                            <th className="px-6 py-4 text-center">Дней отработано</th>
                            <th className="px-6 py-4 text-right">Начислено</th>
                            <th className="px-6 py-4 text-right">Авансы</th>
                            <th className="px-6 py-4 text-right">К выдаче</th>
                            {(user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                              <th className="px-6 py-4 text-center">Действия</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {visibleUsers.map(u => {
                            const currentMonth = new Date().getMonth();
                            const currentYear = new Date().getFullYear();
                            const workedDays = timesheetData.filter(t => {
                                const d = new Date(t.date);
                                return t.userId === u.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear && (t.status === AttendanceStatus.PRESENT || t.status === AttendanceStatus.LATE);
                            }).length;

                            const dailyRate = u.salary / workDaysNorm;
                            const earned = dailyRate * workedDays;
                            const userAdvances = advances.filter(a => a.userId === u.id).reduce((sum, a) => sum + a.amount, 0);
                            const toPay = earned - userAdvances;

                            return (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white dark:drop-shadow-sm">{u.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{u.position}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{u.salary.toLocaleString()} ₸</td>
                                    <td className="px-6 py-4 text-center"><span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-bold">{workedDays} / {workDaysNorm}</span></td>
                                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400 font-medium">+{Math.round(earned).toLocaleString()} ₸</td>
                                    <td className="px-6 py-4 text-right text-orange-600 dark:text-orange-400 font-medium">-{userAdvances.toLocaleString()} ₸</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white text-lg">{Math.round(toPay).toLocaleString()} ₸</td>
                                    
                                    {(user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                                      <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                          <button 
                                            onClick={() => openAdvanceModal(u.id)}
                                            className="p-2 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg hover:bg-orange-200 transition-colors"
                                            title="Выдать аванс"
                                          >
                                            <Wallet size={16} />
                                          </button>
                                          <button 
                                            onClick={() => openEditUserModal(u)}
                                            className="p-2 bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                            title="Редактировать сотрудника"
                                          >
                                            <Edit2 size={16} />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 p-2 italic bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                * Расчет ведется исходя из нормы 22 рабочих дня в месяце. Начислено = (Оклад / 22) * Отработано.
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 max-w-full mx-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Сотрудники и Табель</h1>
           <p className="text-gray-500 dark:text-gray-400">Учет рабочего времени и заработной платы</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('timesheet')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'timesheet' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <div className="flex items-center gap-2"><List size={18} />Табель (График)</div>
        </button>
        <button 
          onClick={() => setActiveTab('employees')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'employees' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <div className="flex items-center gap-2"><CreditCard size={18} />Сотрудники и Зарплата</div>
        </button>
      </div>

      {activeTab === 'timesheet' && (
          <>
            <div className="flex justify-end items-center gap-2 my-4">
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-1">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-600 dark:text-gray-300"><ChevronLeft size={20} /></button>
                    <div className="px-4 py-1 flex items-center gap-2 font-medium text-gray-800 dark:text-white min-w-[200px] justify-center"><CalendarIcon size={18} className="text-blue-500" /><span className="capitalize">{getHeaderDateLabel()}</span></div>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-600 dark:text-gray-300"><ChevronRight size={20} /></button>
                </div>
            </div>
            
            {/* Forced Month View */}
            {renderMonthGrid()}
            
            <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 rounded-lg">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> На работе: {visibleUsers.filter(u => getEntryForUser(u.id, selectedDate)?.status === AttendanceStatus.PRESENT).length}</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Больничный: {visibleUsers.filter(u => getEntryForUser(u.id, selectedDate)?.status === AttendanceStatus.SICK).length}</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Прогул: {visibleUsers.filter(u => getEntryForUser(u.id, selectedDate)?.status === AttendanceStatus.ABSENT).length}</span>
                </div>
                {user.role === UserRole.ENGINEER && <div className="text-xs italic"><AlertCircle size={12} className="inline mr-1" />Для редактирования обратитесь к менеджеру</div>}
            </div>
          </>
      )}

      {activeTab === 'employees' && renderEmployeesList()}

      {/* --- USER MODAL (ADD & EDIT) --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <UserPlus size={24} />
                  {editingUser ? 'Редактировать сотрудника' : 'Новый сотрудник'}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUserFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ФИО Сотрудника</label>
                <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input 
                      required
                      type="text" 
                      value={userForm.name}
                      onChange={e => setUserForm({...userForm, name: e.target.value})}
                      className="w-full pl-9 pr-3 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="Иванов Иван Иванович"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Должность</label>
                    <div className="relative">
                        <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <input 
                        required
                        type="text" 
                        value={userForm.position}
                        onChange={e => setUserForm({...userForm, position: e.target.value})}
                        className="w-full pl-9 pr-2 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Бригадир..."
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Оклад (₸)</label>
                    <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <input 
                        required
                        type="number" 
                        value={userForm.salary}
                        onChange={e => setUserForm({...userForm, salary: e.target.value})}
                        className="w-full pl-9 pr-2 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="250000"
                        />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
                <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input 
                      required
                      type="tel" 
                      value={userForm.phone}
                      onChange={e => setUserForm({...userForm, phone: e.target.value})}
                      className="w-full pl-9 pr-3 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="+7 700 000 00 00"
                    />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors font-medium"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-md dark:shadow-blue-900/30 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {editingUser ? <Save size={18} /> : <Plus size={18} />}
                  {editingUser ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD ADVANCE MODAL --- */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-orange-50 dark:bg-orange-900/20 rounded-t-2xl">
              <h2 className="text-xl font-bold text-orange-900 dark:text-orange-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <Wallet size={24} />
                  Выдача аванса
              </h2>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddAdvanceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сотрудник</label>
                <CustomSelect 
                    value={newAdvanceForm.userId}
                    onChange={(val) => setNewAdvanceForm({...newAdvanceForm, userId: val})}
                    options={users.map(u => ({ value: u.id, label: u.name }))}
                    placeholder="-- Выберите сотрудника --"
                    icon={<UserIcon size={16} />}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сумма (₸)</label>
                <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input 
                      required
                      autoFocus
                      type="number" 
                      value={newAdvanceForm.amount}
                      onChange={e => setNewAdvanceForm({...newAdvanceForm, amount: e.target.value})}
                      className="w-full pl-9 pr-3 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg font-bold"
                      placeholder="0"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата выдачи</label>
                <input 
                  required
                  type="date" 
                  value={newAdvanceForm.date}
                  onChange={e => setNewAdvanceForm({...newAdvanceForm, date: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Комментарий (необязательно)</label>
                <input 
                  type="text" 
                  value={newAdvanceForm.comment}
                  onChange={e => setNewAdvanceForm({...newAdvanceForm, comment: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Например: на ремонт авто"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors font-medium"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-md dark:shadow-orange-900/30 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Выдать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
