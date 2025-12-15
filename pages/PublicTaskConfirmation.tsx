
import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CheckCircle, MapPin, Calendar, Clock, Star, MessageSquare, AlertTriangle, Send, ExternalLink, ThumbsUp, Wrench, Timer } from 'lucide-react';

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
    // Parse URL params from Hash (since we use hash router logic)
    // URL format: #public-task?id=...&token=...
    const hash = window.location.hash;
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
        setError('Заявка не найдена.');
        setLoading(false);
        return;
    }

    // Simple security check
    if (foundTask.publicToken !== token) {
        setError('Доступ запрещен. Неверный токен.');
        setLoading(false);
        return;
    }

    setTask(foundTask);
    
    // Find engineer
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
              rating: 5, // Default max rating since client confirmed without issues
              feedback: '' 
          },
      };

      // Update LocalStorage
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

  if (loading) {
      return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">Загрузка...</div>;
  }

  if (error) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка доступа</h2>
                  <p className="text-gray-500">{error}</p>
              </div>
          </div>
      );
  }

  if (!task) return null;

  // --- CHECK IF WORK IS COMPLETED ---
  if (task.status !== TaskStatus.COMPLETED && !submitted) {
      return (
        <div className="min-h-screen bg-[#F2F2F7] py-8 px-4 font-sans text-slate-900 flex items-center justify-center">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-lg text-center">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Wrench size={40} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-3">Работы еще ведутся</h1>
                <p className="text-slate-500 mb-6">
                    Инженер еще не отметил заявку как выполненную. <br/>
                    Пожалуйста, дождитесь окончания работ для подтверждения.
                </p>
                <div className="bg-gray-50 p-4 rounded-2xl text-left border border-gray-100">
                    <div className="text-xs text-gray-400 uppercase font-bold mb-1">Статус</div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        В процессе выполнения
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] py-8 px-4 font-sans text-slate-900">
        <div className="max-w-lg mx-auto space-y-6">
            
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 mb-4">
                    <CheckCircle size={24} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Приемка работ</h1>
                <p className="text-slate-500 mt-1">Подтвердите выполнение заявки</p>
            </div>

            {/* Success Message */}
            {submitted ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} fill="currentColor" className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Спасибо!</h2>
                    <p className="text-slate-500 mb-8">Работа подтверждена.</p>

                    {/* 2GIS CTA Block */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <MapPin className="text-[#2ECC71]" size={20} />
                                Оставьте отзыв в 2GIS
                            </h3>
                            <p className="text-slate-600 text-sm mb-4">
                                Вам понравилось обслуживание? Будем очень благодарны, если вы поделитесь мнением на карте города.
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
                        {/* Decorative circle */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2ECC71]/10 rounded-full blur-2xl group-hover:bg-[#2ECC71]/20 transition-colors"></div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Task Card */}
                    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Заявка #{task.id.slice(-4)}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {task.status === 'COMPLETED' ? 'Выполнено' : 'В работе'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-4">{task.title}</h2>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <MapPin className="text-gray-400 shrink-0 mt-0.5" size={16} />
                                    <span className="text-slate-600">{task.address}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-gray-400 shrink-0" size={16} />
                                    <span className="text-slate-600">Срок: {task.deadline}</span>
                                </div>
                            </div>

                            {/* Time Tracking Info */}
                            {task.startedAt && task.completedAt && (
                                <div className="mt-4 bg-blue-50 rounded-xl p-3 border border-blue-100">
                                    <div className="flex justify-between text-xs text-blue-800 uppercase font-bold mb-2">
                                        <span>Начало</span>
                                        <span>Завершение</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-slate-800 mb-2">
                                        <span>{formatDateTime(task.startedAt)}</span>
                                        <span className="text-blue-300">→</span>
                                        <span>{formatDateTime(task.completedAt)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-blue-100 flex items-center justify-end gap-2 text-sm">
                                        <span className="text-gray-500">Время работы:</span>
                                        <span className="font-bold text-slate-900 flex items-center gap-1">
                                            <Timer size={14} className="text-blue-500"/>
                                            {getDuration(task.startedAt, task.completedAt)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Engineer Info */}
                        {engineer && (
                            <div className="p-4 bg-gray-50 flex items-center gap-4">
                                <img src={engineer.avatar} alt={engineer.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold">Исполнитель</div>
                                    <div className="font-bold text-slate-900">{engineer.name}</div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="p-6">
                            <h3 className="font-bold text-slate-900 mb-2">Выполненные работы</h3>
                            <p className="text-slate-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl">
                                {task.description}
                            </p>
                        </div>

                        {/* Photos */}
                        {task.attachments && task.attachments.length > 0 && (
                            <div className="p-6 pt-0">
                                <h3 className="font-bold text-slate-900 mb-3">Фотоотчет ({task.attachments.length})</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {task.attachments.map((img, idx) => (
                                        <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                                            <img src={img} alt="Work proof" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Simple Confirmation Button */}
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <button 
                            onClick={handleConfirm}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <ThumbsUp size={24} />
                            Подтвердить выполнение
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            Нажимаю кнопку, вы подтверждаете, что работы выполнены в полном объеме и претензий не имеете.
                        </p>
                    </div>
                </>
            )}
            
            <div className="text-center text-gray-400 text-xs mt-8">
                ServiceCRM Pro • {new Date().getFullYear()}
            </div>
        </div>
    </div>
  );
};
