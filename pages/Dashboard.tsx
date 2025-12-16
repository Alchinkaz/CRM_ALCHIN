
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, UserRole, TaskStatus, TimeEntry, AttendanceStatus, Task, Sale, MonthlyService, Advance, TaskHistory, TaskComment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Wallet, Users as UsersIcon, Clock, Play, Square, MapPin, Loader2, Zap, ArrowUpRight, ChevronRight, Calendar as CalendarIcon, Briefcase, Calculator, Banknote, ArrowDownLeft, PlayCircle, CheckSquare, X, Camera, Send, MessageSquare, Phone, User as UserIcon, Maximize2, Image as ImageIcon } from 'lucide-react';
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
  onUpdateTasks?: (tasks: Task[]) => void;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30'];

// --- UTILITY: Compress Image (Duplicated to avoid file dependency issues) ---
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const scaleSize = MAX_WIDTH / img.width;
                if (scaleSize < 1) {
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const Dashboard: React.FC<DashboardProps> = ({ user, timesheetData, advances = [], tasks, sales, monthlyServices, onCheckIn, onCheckOut, onUpdateTasks }) => {
  const { addToast } = useToast();
  const [isLocating, setIsLocating] = useState(false);

  // --- ENGINEER MODAL STATES ---
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Report State
  const [reportComment, setReportComment] = useState('');
  const [reportImages, setReportImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Chat State inside Modal
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when opening task
  useEffect(() => {
      if (isDetailModalOpen && commentsEndRef.current) {
          commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [isDetailModalOpen, selectedTask?.comments]);

  // --- Real-time Stats Calculation ---
  const totalSales = sales.reduce((acc, sale) => acc + sale.amount, 0);
  const activeTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED).length;
  const pendingService = monthlyServices.filter(s => s.status === 'Pending').length;
  
  // Find today's sales
  const todayDate = new Date().toISOString().split('T')[0];
  const salesToday = sales.filter(s => s.date === todayDate).reduce((acc, s) => acc + s.amount, 0);

  // Find today's time entry for current user
  const todayEntry = timesheetData.find(t => t.userId === user.id && t.date === todayDate);
  const isCheckedIn = todayEntry?.status === AttendanceStatus.PRESENT && !todayEntry.checkOut;
  const isWorkDone = todayEntry?.status === AttendanceStatus.PRESENT && todayEntry.checkOut;

  // --- DYNAMIC CHART DATA GENERATION ---
  const salesChartData = useMemo(() => {
      const data = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
          const dailyTotal = sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.amount, 0);
          data.push({ name: dayName.charAt(0).toUpperCase() + dayName.slice(1), amount: dailyTotal, fullDate: dateStr });
      }
      return data;
  }, [sales]);

  const taskData = [
    { name: 'Новые', value: tasks.filter(t => t.status === TaskStatus.NEW).length },
    { name: 'В работе', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Готово', value: tasks.filter(t => t.status === TaskStatus.COMPLETED).length },
  ];

  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

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

  // --- ACTIONS ---

  const handleTaskClick = (task: Task) => {
      setSelectedTask(task);
      setIsDetailModalOpen(true);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
      if (!onUpdateTasks) return;

      if (newStatus === TaskStatus.COMPLETED) {
          // Open Report Modal
          const task = tasks.find(t => t.id === taskId);
          if (task) {
              setSelectedTask(task);
              setReportComment('');
              setReportImages([]);
              setIsReportModalOpen(true);
              setIsDetailModalOpen(false); // Close detail if open
          }
          return;
      }

      // Logic for Start/Take
      const updatedTasks = tasks.map(t => {
          if (t.id === taskId) {
              const historyEntry: TaskHistory = {
                  id: `h_${Date.now()}`,
                  userId: user.id,
                  userName: user.name,
                  action: 'Принял работу',
                  details: 'Статус: В работе',
                  createdAt: new Date().toISOString()
              };
              const updates: Partial<Task> = {
                  status: newStatus,
                  history: [...(t.history || []), historyEntry]
              };
              if (newStatus === TaskStatus.IN_PROGRESS) {
                  if (!t.startedAt) updates.startedAt = new Date().toISOString();
                  if (!t.engineerId) updates.engineerId = user.id;
              }
              return { ...t, ...updates };
          }
          return t;
      });

      onUpdateTasks(updatedTasks);
      // Update local selected task to reflect changes if modal is open
      const updatedSelected = updatedTasks.find(t => t.id === taskId);
      if (updatedSelected) setSelectedTask(updatedSelected);
      
      addToast('Статус обновлен', 'success');
  };

  const submitReport = () => {
      if (!selectedTask || !onUpdateTasks) return;

      const updatedTasks = tasks.map(t => {
          if (t.id === selectedTask.id) {
              const historyEntry: TaskHistory = {
                  id: `h_${Date.now()}`,
                  userId: user.id,
                  userName: user.name,
                  action: 'Завершил работу',
                  details: `Отчет. Фото: ${reportImages.length}`,
                  createdAt: new Date().toISOString()
              };
              return {
                  ...t,
                  status: TaskStatus.COMPLETED,
                  description: `${t.description} \n\n[ОТЧЕТ]: ${reportComment}`,
                  attachments: reportImages,
                  completedAt: new Date().toISOString(),
                  history: [...(t.history || []), historyEntry]
              };
          }
          return t;
      });

      onUpdateTasks(updatedTasks);
      setIsReportModalOpen(false);
      setSelectedTask(null);
      addToast('Задача выполнена!', 'success');
  };

  const handlePostComment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentText.trim() || !selectedTask || !onUpdateTasks) return;

      const newComment: TaskComment = {
          id: `cm_${Date.now()}`,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          text: commentText,
          createdAt: new Date().toISOString()
      };

      const updatedTasks = tasks.map(t => 
          t.id === selectedTask.id 
              ? { ...t, comments: [...(t.comments || []), newComment] } 
              : t
      );
      
      onUpdateTasks(updatedTasks);
      
      // Update local state immediately for UI response
      const updatedSelected = updatedTasks.find(t => t.id === selectedTask.id);
      if (updatedSelected) setSelectedTask(updatedSelected);
      
      setCommentText('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsCompressing(true);
          const newImages: string[] = [];
          try {
              for (let i = 0; i < e.target.files.length; i++) {
                  const compressed = await compressImage(e.target.files[i]);
                  newImages.push(compressed);
              }
              setReportImages(prev => [...prev, ...newImages]);
          } catch (error) {
              addToast("Ошибка фото", "error");
          } finally {
              setIsCompressing(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  // --- ENGINEER VIEW ---
  if (user.role === UserRole.ENGINEER) {
    const myTasks = tasks.filter(t => {
        const isAssignedToMe = t.engineerId === user.id;
        const isUnassignedMaintenance = !t.engineerId && t.isRecurring;
        if (t.isRecurring) {
            const today = new Date();
            const taskDate = new Date(t.deadline);
            const isFutureMonth = taskDate.getFullYear() > today.getFullYear() || 
                                 (taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() > today.getMonth());
            if (isFutureMonth) return false;
        }
        return isAssignedToMe || isUnassignedMaintenance;
    });

    const calculateFinancials = () => {
        const currentDateObj = new Date();
        const year = currentDateObj.getFullYear();
        const month = currentDateObj.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDaysInMonth = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            const dayOfWeek = new Date(year, month, i).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDaysInMonth++;
        }
        const dailyRate = workingDaysInMonth > 0 ? user.salary / workingDaysInMonth : 0;
        const workedDaysCount = timesheetData.filter(t => {
            const d = new Date(t.date);
            return t.userId === user.id && d.getMonth() === month && d.getFullYear() === year && (t.status === AttendanceStatus.PRESENT || t.status === AttendanceStatus.LATE);
        }).length;
        const earnedAmount = Math.round(dailyRate * workedDaysCount);
        const advancesTaken = advances.filter(a => {
            const d = new Date(a.date);
            return a.userId === user.id && d.getMonth() === month && d.getFullYear() === year;
        }).reduce((sum, a) => sum + a.amount, 0);
        
        return { workingDaysInMonth, dailyRate, workedDaysCount, earnedAmount, advancesTaken, toPay: earnedAmount - advancesTaken };
    };

    const financials = calculateFinancials();

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
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
                            <button onClick={handleCheckOutWrapper} className="bg-white text-ios-red px-6 py-3 rounded-full font-semibold text-[15px] shadow-sm active:scale-95 transition-transform">Завершить</button>
                        ) : (
                            <button onClick={handleGeoCheckIn} disabled={!!isWorkDone || isLocating} className="bg-white text-ios-blue px-6 py-3 rounded-full font-semibold text-[15px] shadow-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2">
                                {isLocating && <Loader2 size={16} className="animate-spin" />}
                                {isWorkDone ? 'Закрыто' : 'Начать'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tasks List Widget */}
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
                    {myTasks.slice(0, 5).map(task => (
                        <div 
                            key={task.id} 
                            onClick={() => handleTaskClick(task)}
                            className="group p-4 rounded-2xl bg-gray-50 dark:bg-slate-700/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800 cursor-pointer active:scale-[0.98] transform duration-100"
                        >
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
                    {myTasks.length === 0 && <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Нет активных задач</div>}
                </div>
            </div>
        </div>

        {/* --- DETAIL MODAL (ENGINEER) --- */}
        {isDetailModalOpen && selectedTask && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" 
                    onClick={() => setIsDetailModalOpen(false)}
                ></div>
                <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl pointer-events-auto max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 rounded-t-3xl">
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mb-1">
                                Заявка #{selectedTask.id.slice(-4)}
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">{selectedTask.title}</h2>
                        </div>
                        <button onClick={() => setIsDetailModalOpen(false)} className="bg-gray-200 dark:bg-slate-700 p-2 rounded-full text-gray-600 dark:text-gray-300">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1 p-5 space-y-6">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 p-3 rounded-xl">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Статус:</span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                                selectedTask.status === TaskStatus.NEW ? 'bg-blue-200 text-blue-800' :
                                selectedTask.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-200 text-yellow-800' :
                                'bg-green-200 text-green-800'
                            }`}>
                                {selectedTask.status === TaskStatus.NEW ? 'Новая' : selectedTask.status === TaskStatus.IN_PROGRESS ? 'В работе' : 'Готово'}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <UsersIcon size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Клиент</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{selectedTask.clientName}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Адрес</div>
                                    <a href={`https://yandex.kz/maps/?text=${selectedTask.address}`} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 underline">
                                        {selectedTask.address}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Описание</div>
                                    <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {selectedTask.description}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chat Section */}
                        <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <MessageSquare size={18} /> Комментарии
                            </h3>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 min-h-[150px] max-h-[250px] overflow-y-auto space-y-3 mb-3">
                                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                                    selectedTask.comments.map(c => (
                                        <div key={c.id} className={`flex gap-2 ${c.userId === user.id ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-6 h-6 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                                                {c.userAvatar ? <img src={c.userAvatar} className="w-full h-full object-cover"/> : <UserIcon className="p-1"/>}
                                            </div>
                                            <div className={`p-2 rounded-lg text-xs max-w-[80%] ${c.userId === user.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-600'}`}>
                                                <div className="font-bold mb-0.5 opacity-80">{c.userName}</div>
                                                {c.text}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-400 text-xs py-4">Нет сообщений</div>
                                )}
                                <div ref={commentsEndRef} />
                            </div>
                            <form onSubmit={handlePostComment} className="flex gap-2">
                                <input 
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder="Написать..."
                                    className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                />
                                <button type="submit" disabled={!commentText} className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50">
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe">
                        {selectedTask.status === TaskStatus.NEW && (
                            <button 
                                onClick={() => handleStatusChange(selectedTask.id, TaskStatus.IN_PROGRESS)}
                                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                <PlayCircle size={20} /> Принять в работу
                            </button>
                        )}
                        {selectedTask.status === TaskStatus.IN_PROGRESS && (
                            <button 
                                onClick={() => handleStatusChange(selectedTask.id, TaskStatus.COMPLETED)}
                                className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                <CheckSquare size={20} /> Завершить
                            </button>
                        )}
                        {selectedTask.status === TaskStatus.COMPLETED && (
                            <button disabled className="w-full py-3 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-2xl font-bold cursor-not-allowed">
                                Выполнено
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- REPORT MODAL (ENGINEER) --- */}
        {isReportModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Отчет о работе</h3>
                        <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400"><X size={24}/></button>
                    </div>
                    <div className="p-5 overflow-y-auto space-y-4">
                        <textarea 
                            value={reportComment}
                            onChange={e => setReportComment(e.target.value)}
                            placeholder="Что было сделано?"
                            rows={4}
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                        />
                        <div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-gray-500 dark:text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <Camera size={20} />
                                {isCompressing ? 'Обработка...' : 'Добавить фото'}
                            </button>
                            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} capture="environment"/>
                        </div>
                        {reportImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {reportImages.map((img, i) => (
                                    <div key={i} className="aspect-square rounded-lg overflow-hidden relative">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => setReportImages(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-5 border-t border-gray-100 dark:border-slate-800">
                        <button 
                            onClick={submitReport}
                            disabled={!reportComment || reportImages.length === 0}
                            className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Отправить отчет
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- ADMIN & MANAGER VIEW ---
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end mb-4">
        <div>
          <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight leading-tight">Обзор</h1>
          <p className="text-[17px] text-gray-500 dark:text-gray-400">Сводка за сегодня: {new Date().toLocaleDateString()}</p>
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
            { label: 'Всего Продаж (Все время)', value: totalSales.toLocaleString() + ' ₸', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-100' },
            { label: 'Продажи (Сегодня)', value: salesToday.toLocaleString() + ' ₸', icon: Zap, color: 'text-ios-green', bg: 'bg-ios-green' },
            { label: 'Активные Заявки', value: activeTasks, icon: CheckCircle, color: 'text-ios-blue', bg: 'bg-ios-blue' },
            { label: 'Долги по ТО', value: pendingService, icon: AlertCircle, color: 'text-ios-orange', bg: 'bg-ios-orange' }
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
            <h3 className="text-[20px] font-bold text-black dark:text-white">Динамика продаж (7 дней)</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData}>
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
                  labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
                />
                <Bar dataKey="amount" fill="#007AFF" radius={[6, 6, 6, 6]} barSize={40} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
            {/* Pie Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col flex-1">
                <h3 className="text-[20px] font-bold text-black dark:text-white mb-6">Статус заявок</h3>
                <div className="h-[180px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={taskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
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
                        <span className="text-2xl font-bold text-black dark:text-white">{activeTasks}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Активно</span>
                    </div>
                </div>
            </div>

            {/* Recent Activity List */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex-1 flex flex-col">
                <h3 className="text-[17px] font-bold text-black dark:text-white mb-4 flex items-center gap-2">
                    <ArrowDownLeft size={20} className="text-green-500" />
                    Последние поступления
                </h3>
                <div className="flex-1 overflow-y-auto max-h-[200px] pr-2 space-y-3">
                    {recentSales.map(sale => (
                        <div key={sale.id} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                            <div>
                                <div className="font-bold text-gray-800 dark:text-white">{sale.clientName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{sale.date}</div>
                            </div>
                            <div className="font-bold text-green-600 dark:text-green-400">+{sale.amount.toLocaleString()} ₸</div>
                        </div>
                    ))}
                    {recentSales.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-4">Нет недавних продаж</div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
