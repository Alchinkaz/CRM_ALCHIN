
import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CheckCircle, MapPin, Calendar, Clock, Star, MessageSquare, AlertTriangle, Send, ExternalLink, ThumbsUp, Wrench, Timer, Loader2, Hourglass, User as UserIcon, ShieldCheck, Lock } from 'lucide-react';

export const PublicTaskConfirmation: React.FC = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('crm_tasks', []);
  const [users] = useLocalStorage<User[]>('crm_users', []);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [engineer, setEngineer] = useState<User | null>(null);

  // Form State
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    // Handle case where hash might be empty or malformed
    if (!hash.includes('?')) {
        setError('Неверная ссылка. Отсутствуют параметры.');
        setLoading(false);
        return;
    }

    const queryString = hash.split('?')[1];
    const urlParams = new URLSearchParams(queryString);
    const taskId = urlParams.get('id');
    const token = urlParams.get('token');

    if (!taskId || !token) {
        setError('Неверная ссылка. Обратитесь к менеджеру.');
        setLoading(false);
        return;
    }

    const foundTask = tasks.find(t => t.id === taskId);

    if (!foundTask) {
        setError('Заявка не найдена. Возможно, она была удалена или ссылка устарела.');
        setLoading(false);
        return;
    }

    if (foundTask.publicToken !== token) {
        setError('Доступ запрещен. Неверный токен безопасности.');
        setLoading(false);
        return;
    }

    setTask(foundTask);
    
    if (foundTask.engineerId) {
        const eng = users.find(u => u.id === foundTask.engineerId);
        setEngineer(eng || null);
    }

    if (foundTask.clientConfirmation?.isConfirmed) {
        setSubmitted(true);
    }

    setLoading(false);
  }, [tasks, users]);

  const handleConfirm = () => {
      if (!task) return;

      const updatedTask: Task = {
          ...task,
          clientConfirmation: {
              isConfirmed: true,
              confirmedAt: new Date().toISOString(),
              rating: 5,
              feedback: '' 
          },
      };

      const newTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
      setTasks(newTasks);
      setSubmitted(true);
  };

  const formatDateTime = (isoString?: string) => {
      if (!isoString) return '--:--';
      return new Date(isoString).toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit'
      });
  };

  const getDuration = (start?: string, end?: string) => {
      if (!start || !end) return null;
      const diff = new Date(end).getTime() - new Date(start).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) return `${hours}ч ${minutes}мин`;
      return `${minutes} мин`;
  };

  const renderStatusBadge = (status: TaskStatus) => {
      switch(status) {
          case TaskStatus.NEW:
              return (
                  <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center w-full">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                          <Calendar size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-blue-900">Заявка создана</h3>
                      <p className="text-sm text-blue-700/70">Ожидается назначение или выезд инженера</p>
                  </div>
              );
          case TaskStatus.IN_PROGRESS:
              return (
                  <div className="flex flex-col items-center justify-center p-6 bg-orange-50 rounded-2xl border border-orange-100 text-center w-full animate-pulse">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2">
                          <Wrench size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-orange-900">В работе</h3>
                      <p className="text-sm text-orange-700/70">Инженер выполняет работы по заявке</p>
                  </div>
              );
          case TaskStatus.COMPLETED:
              return (
                  <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-2xl border border-green-100 text-center w-full">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                          <ShieldCheck size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-green-900">Работы завершены</h3>
                      <p className="text-sm text-green-700/70">Ожидается ваше подтверждение</p>
                  </div>
              );
          default: return null;
      }
  };

  if (loading) {
      return (
        <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-slate-500 font-medium">Загрузка информации о заявке...</p>
        </div>
      );
  }

  if (error) {
      return (
          <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Ошибка доступа</h2>
                  <p className="text-slate-500 mb-6">{error}</p>
                  <a href="/" className="text-blue-600 font-bold hover:underline">Вернуться на главную</a>
              </div>
          </div>
      );
  }

  if (!task) return null;

  return (
    <div className="min-h-screen bg-[#F2F2F7] py-8 px-4 font-sans text-slate-900">
        <div className="max-w-lg mx-auto space-y-6">
            
            {/* Top Logo / Brand */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-extrabold text-slate-400 uppercase tracking-widest">ServiceCRM</h1>
            </div>

            {/* Success View */}
            {submitted ? (
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center animate-in fade-in zoom-in duration-300 border border-white/60">
                    <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <CheckCircle size={48} strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Спасибо!</h2>
                    <p className="text-slate-500 mb-8 text-lg">Вы успешно подтвердили выполнение работ.</p>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <MapPin className="text-[#2ECC71]" size={20} />
                                Оцените нас в 2GIS
                            </h3>
                            <p className="text-slate-600 text-sm mb-4">
                                Ваше мнение помогает нам становиться лучше. Будем рады отзыву!
                            </p>
                            <a 
                                href="https://2gis.kz/aktau/firm/70000001081123283/tab/reviews/addreview" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#2ECC71] hover:bg-[#27AE60] text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 active:scale-95"
                            >
                                Перейти в 2GIS
                                <ExternalLink size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Main Task Card */}
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-white/60">
                        
                        {/* Status Header */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                    Заявка #{task.id.slice(-4)}
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                    {new Date(task.createdAt || Date.now()).toLocaleDateString()}
                                </span>
                            </div>
                            
                            {renderStatusBadge(task.status)}
                        </div>

                        {/* Task Details */}
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Что нужно сделать</label>
                                <h2 className="text-xl font-bold text-slate-900 leading-tight">{task.title}</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Адрес объекта</div>
                                        <div className="font-medium text-slate-800">{task.address}</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Дата выполнения</div>
                                        <div className="font-medium text-slate-800">
                                            {new Date(task.deadline).toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                                        <UserIcon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Исполнитель</div>
                                        {engineer ? (
                                            <div className="font-medium text-slate-800">{engineer.name} <span className="text-slate-400 font-normal">({engineer.position || 'Инженер'})</span></div>
                                        ) : (
                                            <div className="font-medium text-orange-500 italic">Назначается...</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description Block */}
                            {(task.description || (task.status === TaskStatus.COMPLETED && task.description)) && (
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Детали / Отчет</div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {task.description}
                                    </p>
                                </div>
                            )}

                            {/* Time & Photos (If Completed) */}
                            {task.status === TaskStatus.COMPLETED && (
                                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-4">
                                    {task.startedAt && task.completedAt && (
                                        <div className="flex justify-between items-center text-sm bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                            <span className="text-slate-500">Затрачено времени:</span>
                                            <span className="font-bold text-blue-700 flex items-center gap-1">
                                                <Timer size={14} />
                                                {getDuration(task.startedAt, task.completedAt)}
                                            </span>
                                        </div>
                                    )}

                                    {task.attachments && task.attachments.length > 0 && (
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Фотоотчет ({task.attachments.length})</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {task.attachments.map((img, idx) => (
                                                    <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-300">
                                                        <img src={img} alt="Work proof" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="sticky bottom-6">
                        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-4 border border-white/50">
                            {task.status === TaskStatus.COMPLETED ? (
                                <button 
                                    onClick={handleConfirm}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <ThumbsUp size={24} />
                                    Подтвердить выполнение
                                </button>
                            ) : (
                                <button 
                                    disabled
                                    className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold text-lg cursor-not-allowed flex items-center justify-center gap-2 border border-slate-200"
                                >
                                    <Lock size={20} />
                                    Подтверждение недоступно
                                </button>
                            )}
                            <p className="text-center text-[10px] text-slate-400 mt-2">
                                {task.status === TaskStatus.COMPLETED 
                                    ? "Нажимаю кнопку, вы подтверждаете отсутствие претензий." 
                                    : "Кнопка станет активной после завершения работ инженером."}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};
