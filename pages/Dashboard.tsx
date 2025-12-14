
import React, { useState } from 'react';
import { User, UserRole, TaskStatus, TimeEntry, AttendanceStatus, Task, Sale, MonthlyService } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Wallet, Users as UsersIcon, Clock, Play, Square, MapPin, Loader2, Zap, ArrowUpRight, ChevronRight } from 'lucide-react';

interface DashboardProps {
  user: User;
  timesheetData: TimeEntry[];
  tasks: Task[];
  sales: Sale[];
  monthlyServices: MonthlyService[];
  onCheckIn: (location?: { lat: number; lng: number }) => void;
  onCheckOut: () => void;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30'];

export const Dashboard: React.FC<DashboardProps> = ({ user, timesheetData, tasks, sales, monthlyServices, onCheckIn, onCheckOut }) => {
  const [isLocating, setIsLocating] = useState(false);

  const totalSales = sales.reduce((acc, sale) => acc + sale.amount, 0);
  const activeTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED).length;
  const pendingService = monthlyServices.filter(s => s.status === 'Pending').length;

  // Find today's time entry for current user
  const today = new Date().toISOString().split('T')[0];
  const todayEntry = timesheetData.find(t => t.userId === user.id && t.date === today);
  const isCheckedIn = todayEntry?.status === AttendanceStatus.PRESENT && !todayEntry.checkOut;
  const isWorkDone = todayEntry?.status === AttendanceStatus.PRESENT && todayEntry.checkOut;

  // Mock chart data generation from real data (simplified)
  const salesData = [
    { name: 'Пн', amount: 120000 },
    { name: 'Вт', amount: 80000 },
    { name: 'Ср', amount: 450000 },
    { name: 'Чт', amount: 95000 },
    { name: 'Пт', amount: 210000 },
  ];

  const taskData = [
    { name: 'Новые', value: tasks.filter(t => t.status === TaskStatus.NEW).length },
    { name: 'В работе', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Готово', value: tasks.filter(t => t.status === TaskStatus.COMPLETED).length },
  ];

  const handleGeoCheckIn = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onCheckIn({ lat: latitude, lng: longitude });
                setIsLocating(false);
            },
            (error) => {
                console.error("GPS Error:", error.message);
                alert(`Не удалось определить местоположение: ${error.message}. Проверьте разрешения браузера.`);
                onCheckIn(); 
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Ваш браузер не поддерживает геолокацию");
        onCheckIn();
        setIsLocating(false);
    }
  };

  // --- ENGINEER VIEW ---
  if (user.role === UserRole.ENGINEER) {
    const myTasks = tasks.filter(t => t.engineerId === user.id);
    const completedToday = myTasks.filter(t => t.status === TaskStatus.COMPLETED).length; // Needs improved date filtering in real app
    
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight mb-2">Главная</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Widget */}
            <div className="bg-ios-blue text-white rounded-ios p-8 relative overflow-hidden shadow-ios-float flex flex-col justify-between h-[300px]">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                    <h2 className="text-[28px] font-bold mb-1">Привет, {user.name.split(' ')[0]}!</h2>
                    <p className="text-blue-100 text-[17px]">У тебя {myTasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED).length} активных заявок.</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-ios-sm p-5 border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[13px] font-semibold uppercase tracking-wide opacity-80 flex items-center gap-1.5">
                            <Clock size={14} /> Смена
                        </span>
                        {isCheckedIn && <span className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"></span>}
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div>
                             <div className="text-[34px] font-bold leading-none">
                                {isCheckedIn ? todayEntry.checkIn : isWorkDone ? `${todayEntry.totalHours}ч` : '--:--'}
                             </div>
                             <div className="text-[13px] opacity-70 mt-1">
                                {isCheckedIn ? 'Начало работы' : isWorkDone ? 'Всего за день' : 'Не начато'}
                             </div>
                        </div>

                        {isCheckedIn ? (
                            <button 
                                onClick={onCheckOut}
                                className="bg-white text-ios-red px-6 py-3 rounded-full font-semibold text-[15px] shadow-sm active:scale-95 transition-transform"
                            >
                                Завершить
                            </button>
                        ) : (
                            <button 
                                onClick={handleGeoCheckIn}
                                disabled={!!isWorkDone || isLocating}
                                className="bg-white text-ios-blue px-6 py-3 rounded-full font-semibold text-[15px] shadow-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLocating && <Loader2 size={16} className="animate-spin" />}
                                {isWorkDone ? 'Закрыто' : 'Начать'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Small Widgets */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white dark:bg-slate-800 rounded-ios p-6 shadow-ios flex flex-col justify-between">
                    <div className="w-10 h-10 bg-ios-green/10 text-ios-green rounded-full flex items-center justify-center mb-2">
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <div className="text-[32px] font-bold text-black dark:text-white">{completedToday}</div>
                        <div className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">Выполнено</div>
                    </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 rounded-ios p-6 shadow-ios flex flex-col justify-between">
                    <div className="w-10 h-10 bg-ios-blue/10 text-ios-blue rounded-full flex items-center justify-center mb-2">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="text-[32px] font-bold text-black dark:text-white">18.5k</div>
                        <div className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">Заработано</div>
                    </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 rounded-ios p-6 shadow-ios col-span-2 flex items-center justify-between">
                    <div>
                        <div className="text-[13px] text-gray-400 dark:text-gray-500 font-medium uppercase mb-1">Рейтинг</div>
                        <div className="text-[28px] font-bold text-black dark:text-white">4.9 <span className="text-gray-300 text-[20px]">/ 5.0</span></div>
                    </div>
                    <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => <div key={s} className="w-2 h-8 rounded-full bg-ios-yellow"></div>)}
                    </div>
                 </div>
            </div>
        </div>

        <div className="mt-8">
            <h2 className="text-[22px] font-bold text-black dark:text-white mb-4">Ближайшие задачи</h2>
            <div className="ios-list-group shadow-sm dark:bg-slate-800">
                {myTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="ios-list-item justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div>
                            <div className="font-semibold text-[17px] text-black dark:text-white mb-1">{task.title}</div>
                            <div className="text-[15px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin size={14} /> {task.address}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[13px] font-medium ${
                                task.status === TaskStatus.NEW ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            }`}>
                                {task.status}
                            </span>
                            <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // --- ADMIN & MANAGER VIEW ---
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end mb-4">
        <div>
          <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight leading-tight">Обзор</h1>
          <p className="text-[17px] text-gray-500 dark:text-gray-400">Октябрь 2023</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-full p-1 pl-4 pr-1 shadow-sm flex items-center gap-3">
             <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Статус:</div>
             {isCheckedIn ? (
                <button onClick={onCheckOut} className="bg-ios-red text-white px-4 py-1.5 rounded-full font-medium text-[15px] flex items-center gap-2 active:scale-95 transition-transform">
                    <Square size={12} fill="currentColor"/> Стоп ({todayEntry.checkIn})
                </button>
             ) : (
                <button onClick={handleGeoCheckIn} className="bg-ios-blue text-white px-4 py-1.5 rounded-full font-medium text-[15px] flex items-center gap-2 active:scale-95 transition-transform" disabled={isLocating}>
                    {isLocating ? <Loader2 size={12} className="animate-spin"/> : <Play size={12} fill="currentColor"/>} Старт
                </button>
             )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Продажи', value: totalSales.toLocaleString() + ' ₸', icon: Zap, color: 'text-ios-green', bg: 'bg-ios-green' },
            { label: 'Заявки', value: activeTasks, icon: CheckCircle, color: 'text-ios-blue', bg: 'bg-ios-blue' },
            { label: 'Долги по ТО', value: pendingService, icon: AlertCircle, color: 'text-ios-orange', bg: 'bg-ios-orange' },
            { label: 'Новые клиенты', value: '12', icon: ArrowUpRight, color: 'text-ios-indigo', bg: 'bg-ios-indigo' }
        ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-ios shadow-ios hover:scale-[1.02] transition-transform">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 ${stat.bg}/10 ${stat.color} rounded-full flex items-center justify-center`}>
                        <stat.icon size={22} />
                    </div>
                    <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                </div>
                <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
                <div className="text-[28px] font-bold text-black dark:text-white leading-none">{stat.value}</div>
            </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[20px] font-bold text-black dark:text-white">Динамика продаж</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8E8E93', fontSize: 13, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#8E8E93', fontSize: 13}} />
                <Tooltip 
                  cursor={{fill: '#F2F2F7', radius: 8}}
                  contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      backdropFilter: 'blur(10px)', 
                      borderRadius: '12px', 
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      color: '#000'
                  }} 
                />
                <Bar dataKey="amount" fill="#007AFF" radius={[6, 6, 6, 6]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col">
          <h3 className="text-[20px] font-bold text-black dark:text-white mb-6">Статус заявок</h3>
          <div className="h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={6}
                >
                  {taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      borderRadius: '12px', 
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
             {/* Center Text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-black dark:text-white">{activeTasks}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Активно</span>
            </div>
          </div>
          
          <div className="space-y-3 mt-6">
            {taskData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                    <span className="text-[15px] text-gray-700 dark:text-gray-300 font-medium">{entry.name}</span>
                </div>
                <span className="text-[15px] font-bold text-black dark:text-white">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
