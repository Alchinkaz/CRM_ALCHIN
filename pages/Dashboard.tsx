
import React, { useState } from 'react';
import { User, UserRole, TaskStatus, TimeEntry, AttendanceStatus, Task, Sale, MonthlyService, Advance } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Wallet, Users as UsersIcon, Clock, Play, Square, MapPin, Loader2, Zap, ArrowUpRight, ChevronRight, Calendar as CalendarIcon, Briefcase, Calculator, Banknote } from 'lucide-react';
import { useToast } from '../components/Toast';

interface DashboardProps {
  user: User;
  timesheetData: TimeEntry[];
  advances?: Advance[];
  tasks: Task[];
  sales: Sale[];
  monthlyServices: MonthlyService[];
  onCheckIn: (location?: { lat: number; lng: number }) => void;
  onCheckOut: () => void;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30'];

export const Dashboard: React.FC<DashboardProps> = ({ user, timesheetData, advances = [], tasks, sales, monthlyServices, onCheckIn, onCheckOut }) => {
  const { addToast } = useToast();
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
                addToast("Смена открыта с геолокацией", "success");
            },
            (error) => {
                console.error("GPS Error:", error.message);
                addToast(`Геолокация недоступна: ${error.message}`, "warning");
                onCheckIn(); 
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        addToast("Ваш браузер не поддерживает геолокацию", "error");
        onCheckIn();
        setIsLocating(false);
    }
  };

  const handleCheckOutWrapper = () => {
      onCheckOut();
      addToast("Смена завершена", "info");
  };

  // --- ENGINEER VIEW ---
  if (user.role === UserRole.ENGINEER) {
    // UPDATED FILTER:
    // 1. Tasks explicitly assigned to this engineer
    // 2. Unassigned tasks IF they are Recurring/Maintenance (TO)
    const myTasks = tasks.filter(t => {
        const isAssignedToMe = t.engineerId === user.id;
        const isUnassignedMaintenance = !t.engineerId && t.isRecurring;
        
        // Ensure future recurring tasks are hidden (same logic as TasksPage)
        if (t.isRecurring) {
            const today = new Date();
            const taskDate = new Date(t.deadline);
            const isFutureMonth = taskDate.getFullYear() > today.getFullYear() || 
                                 (taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() > today.getMonth());
            if (isFutureMonth) return false;
        }

        return isAssignedToMe || isUnassignedMaintenance;
    });

    const completedToday = myTasks.filter(t => t.status === TaskStatus.COMPLETED).length; 
    
    // --- Render Logic for Mini Timesheet (Engineer) ---
    const renderEngineerTimesheet = () => {
        const currentDateObj = new Date();
        const year = currentDateObj.getFullYear();
        const month = currentDateObj.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const getCellColor = (status?: AttendanceStatus) => {
            switch(status) {
                case AttendanceStatus.PRESENT: return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
                case AttendanceStatus.LATE: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
                case AttendanceStatus.SICK: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
                case AttendanceStatus.ABSENT: return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
                case AttendanceStatus.LEAVE: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                default: return 'bg-gray-50 text-gray-400 dark:bg-slate-700/50 dark:text-gray-500';
            }
        };

        const getCellLabel = (status?: AttendanceStatus) => {
             if (status === AttendanceStatus.PRESENT) return '8';
             if (status === AttendanceStatus.LATE) return '8*';
             if (status === AttendanceStatus.SICK) return 'Б';
             if (status === AttendanceStatus.LEAVE) return 'О';
             if (status === AttendanceStatus.ABSENT) return 'Н';
             return '-';
        };

        return (
            <div className="bg-white dark:bg-slate-800 rounded-ios p-6 shadow-ios border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-bold text-lg">
                    <CalendarIcon size={20} className="text-blue-600 dark:text-blue-400" />
                    Мой табель (Октябрь)
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {daysArray.map(day => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const entry = timesheetData.find(t => t.userId === user.id && t.date === dateStr);
                        const isToday = day === currentDateObj.getDate();
                        
                        return (
                            <div key={day} className={`flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg ${isToday ? 'ring-2 ring-blue-500' : ''} ${getCellColor(entry?.status)}`}>
                                <span className="text-[10px] sm:text-xs font-medium opacity-70 mb-0.5">{day}</span>
                                <span className="text-xs sm:text-sm font-bold">{getCellLabel(entry?.status)}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 flex gap-4 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto pb-2">
                    <span className="flex items-center gap-1 min-w-fit"><span className="w-2 h-2 rounded-full bg-green-500"></span> 8 - Явка</span>
                    <span className="flex items-center gap-1 min-w-fit"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Б - Больничный</span>
                    <span className="flex items-center gap-1 min-w-fit"><span className="w-2 h-2 rounded-full bg-blue-500"></span> О - Отпуск</span>
                </div>
            </div>
        );
    };

    // --- Financial Calculations for Engineer ---
    const calculateFinancials = () => {
        const currentDateObj = new Date();
        const year = currentDateObj.getFullYear();
        const month = currentDateObj.getMonth();
        
        // 1. Calculate Business Days in Current Month (Mon-Fri)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDaysInMonth = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            const dayOfWeek = new Date(year, month, i).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDaysInMonth++;
        }
        
        // 2. Daily Rate
        const dailyRate = workingDaysInMonth > 0 ? user.salary / workingDaysInMonth : 0;

        // 3. Worked Days (Present or Late)
        const workedDaysCount = timesheetData.filter(t => {
            const d = new Date(t.date);
            return t.userId === user.id && 
                   d.getMonth() === month && 
                   d.getFullYear() === year && 
                   (t.status === AttendanceStatus.PRESENT || t.status === AttendanceStatus.LATE);
        }).length;

        // 4. Earned Amount
        const earnedAmount = Math.round(dailyRate * workedDaysCount);

        // 5. Advances Taken in Current Month
        const advancesTaken = advances.filter(a => {
            const d = new Date(a.date);
            return a.userId === user.id && d.getMonth() === month && d.getFullYear() === year;
        }).reduce((sum, a) => sum + a.amount, 0);

        // 6. To Pay
        const toPay = earnedAmount - advancesTaken;

        return {
            workingDaysInMonth,
            dailyRate,
            workedDaysCount,
            earnedAmount,
            advancesTaken,
            toPay
        };
    };

    const financials = calculateFinancials();

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight mb-2">Главная</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Widget */}
            <div className="bg-ios-blue text-white rounded-ios p-8 relative overflow-hidden shadow-ios-float flex flex-col justify-between min-h-[300px]">
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
                                onClick={handleCheckOutWrapper}
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

            {/* Engineer Financial Card */}
            <div className="bg-white dark:bg-slate-800 rounded-ios p-6 shadow-ios flex flex-col justify-between min-h-[300px] border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center justify-center">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Мои финансы</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Октябрь ({financials.workingDaysInMonth} раб. дней)</p>
                    </div>
                </div>

                <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Banknote size={14}/> Оклад (мес.)</span>
                        <span className="font-bold text-gray-900 dark:text-white">{user.salary.toLocaleString()} ₸</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Calculator size={14}/> Ставка в день</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{Math.round(financials.dailyRate).toLocaleString()} ₸</span>
                    </div>
                    <div className="w-full h-px bg-gray-100 dark:bg-slate-700 my-2"></div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Отработано дней</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{financials.workedDaysCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Начислено</span>
                        <span className="font-bold text-green-600 dark:text-green-400">+{financials.earnedAmount.toLocaleString()} ₸</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Авансы</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">-{financials.advancesTaken.toLocaleString()} ₸</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">К выдаче</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{financials.toPay.toLocaleString()} ₸</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Engineer Dashboard Grid: Tasks & Timesheet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            
            {/* 1. SHORTENED TASKS LIST */}
            <div className="bg-white dark:bg-slate-800 rounded-ios p-6 shadow-ios border border-gray-100 dark:border-slate-700 h-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[20px] font-bold text-black dark:text-white flex items-center gap-2">
                        <Briefcase size={20} className="text-blue-500"/>
                        Мои задачи
                    </h2>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-bold">
                        {myTasks.length}
                    </span>
                </div>
                
                <div className="space-y-3">
                    {myTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="group p-3 rounded-2xl bg-gray-50 dark:bg-slate-700/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800 cursor-pointer">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                    task.status === TaskStatus.NEW ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                    {task.status === TaskStatus.NEW ? 'Новая' : task.status === TaskStatus.IN_PROGRESS ? 'В работе' : 'Готово'}
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono">{task.deadline.split('-').slice(1).reverse().join('.')}</span>
                            </div>
                            <div className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">{task.title}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                                <MapPin size={12} /> {task.address}
                            </div>
                        </div>
                    ))}
                    {myTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                            Нет активных задач
                        </div>
                    )}
                    {myTasks.length > 3 && (
                        <button className="w-full text-center text-sm font-bold text-blue-600 dark:text-blue-400 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                            Показать еще {myTasks.length - 3}...
                        </button>
                    )}
                </div>
            </div>

            {/* 2. TIMESHEET GRID (Added for Engineer) */}
            {renderEngineerTimesheet()}
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
                <button onClick={handleCheckOutWrapper} className="bg-ios-red text-white px-4 py-1.5 rounded-full font-medium text-[15px] flex items-center gap-2 active:scale-95 transition-transform">
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
