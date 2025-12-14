
import React, { useState } from 'react';
import { User, UserRole, Role, ResourceAction, Permission } from '../types';
import { ROLES } from '../mockData';
import { Shield, Key, UserCheck, Plus, X, Save, Lock, Mail, Users, User as UserIcon, UserPlus, Check, Trash2, Edit, ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SettingsPageProps {
  user: User;
  users: User[];
  onUpdateUser: (user: User) => void;
}

// ... (Keep existing ResourceNode, RESOURCE_TREE, and ACTIONS) ...
interface ResourceNode {
  id: string;
  label: string;
  children?: ResourceNode[];
}

const RESOURCE_TREE: ResourceNode[] = [
  {
    id: 'section_analytics',
    label: 'Аналитика',
    children: [
        { id: 'dashboard', label: 'Базовая аналитика' },
    ]
  },
  {
    id: 'section_clients',
    label: 'Клиенты',
    children: [
        { id: 'clients', label: 'Просмотр и редактирование клиентов' },
        { id: 'clients_export', label: 'Экспорт базы данных' },
    ]
  },
  {
    id: 'section_tasks',
    label: 'Заявки и Работы',
    children: [
        { id: 'tasks', label: 'Работа с заявками' },
        { id: 'tasks_assign', label: 'Назначение исполнителей' },
    ]
  },
  {
    id: 'section_service',
    label: 'Сервис и Оборудование',
    children: [
        { id: 'service', label: 'Управление объектами' },
        { id: 'trackers', label: 'База GPS трекеров' },
        { id: 'service_billing', label: 'Биллинг и начисления' },
    ]
  },
  {
    id: 'section_finance',
    label: 'Финансы и Учет',
    children: [
        { id: 'finance', label: 'Доходы и Расходы' },
        { id: 'salary', label: 'Сотрудники и Зарплата' },
    ]
  },
  {
    id: 'section_system',
    label: 'Настройки системы',
    children: [
        { id: 'settings', label: 'Общие настройки' },
        { id: 'users', label: 'Управление пользователями' },
    ]
  },
];

const ACTIONS: { id: ResourceAction, label: string }[] = [
    { id: 'view', label: 'Просмотр' },
    { id: 'create', label: 'Добавление' },
    { id: 'edit', label: 'Изменение' },
    { id: 'delete', label: 'Удаление' }
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, users, onUpdateUser }) => {
  // ... (Keep existing logic: activeTab, roles, modals, etc.) ...
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'security'>('users');
  const [roles, setRoles] = useLocalStorage<Role[]>('crm_roles', ROLES);
  
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['section_analytics', 'section_clients']));

  const [roleForm, setRoleForm] = useState<{
      name: string;
      description: string;
      permissions: Record<string, ResourceAction[]>;
  }>({ name: '', description: '', permissions: {} });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    roleId: ''
  });

  const toggleSection = (sectionId: string) => {
      const newSet = new Set(expandedSections);
      if (newSet.has(sectionId)) {
          newSet.delete(sectionId);
      } else {
          newSet.add(sectionId);
      }
      setExpandedSections(newSet);
  };

  const openRoleModal = (role?: Role) => {
      const allSections = RESOURCE_TREE.map(n => n.id);
      setExpandedSections(new Set(allSections));

      if (role) {
          setEditingRole(role);
          const permsObj: Record<string, ResourceAction[]> = {};
          role.permissions.forEach(p => {
              permsObj[p.resourceId] = p.actions;
          });
          setRoleForm({ name: role.name, description: role.description, permissions: permsObj });
      } else {
          setEditingRole(null);
          setRoleForm({ name: '', description: '', permissions: {} });
      }
      setIsRoleModalOpen(true);
  };

  const togglePermission = (resourceId: string, action: ResourceAction) => {
      setRoleForm(prev => {
          const currentActions = prev.permissions[resourceId] || [];
          let newActions;
          if (currentActions.includes(action)) {
              newActions = currentActions.filter(a => a !== action);
          } else {
              newActions = [...currentActions, action];
          }
          return {
              ...prev,
              permissions: { ...prev.permissions, [resourceId]: newActions }
          };
      });
  };

  const toggleRowPermissions = (resourceId: string) => {
      setRoleForm(prev => {
          const currentActions = prev.permissions[resourceId] || [];
          const isFull = currentActions.length === 4;
          return {
              ...prev,
              permissions: {
                  ...prev.permissions,
                  [resourceId]: isFull ? [] : ['view', 'create', 'edit', 'delete']
              }
          };
      });
  };

  const handleRoleSave = (e: React.FormEvent) => {
      e.preventDefault();
      const permissionsArray: Permission[] = (Object.entries(roleForm.permissions) as [string, ResourceAction[]][])
          .filter(([_, actions]) => actions.length > 0)
          .map(([resourceId, actions]) => ({ resourceId, actions }));

      if (editingRole) {
          setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, name: roleForm.name, description: roleForm.description, permissions: permissionsArray } : r));
      } else {
          const newRole: Role = {
              id: `r_${Date.now()}`,
              name: roleForm.name,
              description: roleForm.description,
              isSystem: false,
              permissions: permissionsArray
          };
          setRoles(prev => [...prev, newRole]);
      }
      setIsRoleModalOpen(false);
  };
  
  const deleteRole = (roleId: string) => {
      if (confirm('Вы уверены, что хотите удалить эту роль?')) {
        setRoles(prev => prev.filter(r => r.id !== roleId));
      }
  };

  const handleCreateSystemUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    const employee = users.find(u => u.id === selectedEmployeeId);
    if (!employee) return;
    
    const selectedRole = roles.find(r => r.id === userFormData.roleId);
    let legacyRole = UserRole.ENGINEER;
    if (selectedRole?.id === 'r_admin') legacyRole = UserRole.ADMIN;
    if (selectedRole?.id === 'r_manager') legacyRole = UserRole.MANAGER;

    const updatedUser: User = {
      ...employee,
      email: userFormData.email,
      password: userFormData.password,
      role: legacyRole,
      customRoleId: userFormData.roleId,
      isSystemUser: true
    };

    onUpdateUser(updatedUser);
    setIsUserModalOpen(false);
    resetUserForm();
  };

  const resetUserForm = () => {
    setSelectedEmployeeId('');
    setUserFormData({ email: '', password: '', roleId: '' });
  };
  
  const systemUsers = users.filter(u => u.isSystemUser);
  const availableEmployees = users.filter(u => !u.isSystemUser);

  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl m-8 shadow-sm">
        <Lock className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 dark:drop-shadow-sm">Доступ ограничен</h2>
        <p className="text-slate-600 dark:text-gray-300">Только администраторы могут управлять настройками системы.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white dark:drop-shadow-sm">Настройки системы</h1>
          <p className="text-slate-600 dark:text-gray-400 font-medium">Управление пользователями, ролями и правами доступа</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="md:col-span-1 space-y-3">
           <button 
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'users' ? 'bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 shadow-glass border border-white/40 dark:border-slate-600' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <UserCheck size={20} />
             Пользователи
           </button>
           <button 
                onClick={() => setActiveTab('roles')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'roles' ? 'bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 shadow-glass border border-white/40 dark:border-slate-600' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <Shield size={20} />
             Роли и Права
           </button>
           <button 
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'security' ? 'bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 shadow-glass border border-white/40 dark:border-slate-600' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <Key size={20} />
             Безопасность
           </button>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3 space-y-6">
          
          {/* --- TAB: USERS --- */}
          {activeTab === 'users' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden animate-in fade-in shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="p-6 border-b border-white/20 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-blue-600 dark:text-blue-400" />
                    Список пользователей
                </h3>
                <button 
                    onClick={() => setIsUserModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl hover:opacity-90 transition-colors text-sm shadow-md shadow-blue-500/20 font-bold"
                    >
                    <Plus size={16} />
                    <span>Добавить</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    {/* ... table content ... */}
                    <thead className="bg-white/30 dark:bg-slate-700/30 text-slate-500 dark:text-gray-400 border-b border-white/20 dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-4 font-bold">Пользователь</th>
                        <th className="px-6 py-4 font-bold">Логин (Email)</th>
                        <th className="px-6 py-4 font-bold">Роль</th>
                        <th className="px-6 py-4 font-bold text-center">Статус</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 dark:divide-slate-700">
                    {systemUsers.map(u => {
                        const userRoleName = roles.find(r => r.id === u.customRoleId)?.name || u.role;
                        return (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-xl shadow-sm" />
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white dark:drop-shadow-sm">{u.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-gray-400">{u.position}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-gray-300">
                            {u.email || 'Не указан'}
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-lg text-xs font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                {userRoleName}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                Активен
                            </span>
                        </td>
                        </tr>
                    )})}
                    </tbody>
                </table>
                </div>
             </div>
          )}

          {/* --- TAB: ROLES --- */}
          {activeTab === 'roles' && (
              <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-end">
                      <button 
                        onClick={() => openRoleModal()}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/20 font-bold"
                      >
                        <Plus size={18} />
                        <span>Создать роль</span>
                      </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {roles.map(role => (
                          <div key={role.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow border border-gray-100 dark:border-slate-700">
                              <div className="flex items-start gap-4">
                                  <div className={`p-4 rounded-2xl ${role.isSystem ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'} shadow-sm`}>
                                      <Shield size={24} />
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                                          {role.name}
                                          {role.isSystem && <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">System</span>}
                                      </h4>
                                      <p className="text-sm text-slate-500 dark:text-gray-400">{role.description}</p>
                                      <div className="mt-2 text-xs font-bold text-slate-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/40 w-fit px-2 py-1 rounded-lg">
                                          Доступ к: {role.permissions.length} разделам
                                      </div>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => openRoleModal(role)}
                                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors" title="Редактировать права"
                                  >
                                      <Edit size={20} />
                                  </button>
                                  {!role.isSystem && (
                                    <button 
                                        onClick={() => deleteRole(role.id)}
                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Удалить роль"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* --- TAB: SECURITY --- */}
          {activeTab === 'security' && (
              <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl text-center animate-in fade-in shadow-sm border border-gray-100 dark:border-slate-700">
                  {/* ... content ... */}
                  <div className="inline-block p-6 bg-slate-100 dark:bg-slate-700 rounded-full mb-6 shadow-inner">
                      <Lock size={40} className="text-slate-400 dark:text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white dark:drop-shadow-sm">Журнал безопасности</h3>
                  <p className="text-slate-500 dark:text-gray-400 mb-8 max-w-md mx-auto">История входов и действий пользователей будет отображена здесь.</p>
                  <button className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors font-bold">
                      Скачать логи (CSV)
                  </button>
              </div>
          )}

        </div>
      </div>

      {/* --- CREATE USER MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <UserPlus size={24} />
                  Создание пользователя
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSystemUser} className="p-6 space-y-4">
              {/* ... form content ... */}
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors font-medium"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={!selectedEmployeeId}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-blue-500/20 font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  Создать доступ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ROLE EDITOR MODAL --- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-8 max-h-[90vh] border border-gray-100 dark:border-slate-700">
             <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <Shield size={24} />
                  {editingRole ? 'Редактирование роли' : 'Создание роли'}
              </h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleRoleSave} className="flex-1 flex flex-col overflow-hidden">
                {/* ... form content ... */}
                <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-800/30">
                    <button 
                        type="button" 
                        onClick={() => setIsRoleModalOpen(false)}
                        className="px-6 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 font-bold transition-colors"
                    >
                        Отмена
                    </button>
                    <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-blue-500/20 font-bold transition-colors flex items-center gap-2"
                    >
                        <Save size={18} />
                        Сохранить роль
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
