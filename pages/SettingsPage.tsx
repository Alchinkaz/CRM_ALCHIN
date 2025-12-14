
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

// Hierarchical Resource Definition
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
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'security'>('users');
  
  // Roles State with Persistence
  const [roles, setRoles] = useLocalStorage<Role[]>('crm_roles', ROLES);
  
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Expand/Collapse state for sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['section_analytics', 'section_clients']));

  const [roleForm, setRoleForm] = useState<{
      name: string;
      description: string;
      permissions: Record<string, ResourceAction[]>; // resourceId -> actions[]
  }>({ name: '', description: '', permissions: {} });

  // Users State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    roleId: ''
  });

  // --- ROLE MANAGEMENT LOGIC ---

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
      // Default to expand all when opening
      const allSections = RESOURCE_TREE.map(n => n.id);
      setExpandedSections(new Set(allSections));

      if (role) {
          setEditingRole(role);
          // Convert permissions array to quick lookup object
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
          // If all selected, deselect all. Otherwise, select all.
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
      // Convert map back to permissions array
      // Explicitly cast Object.entries result to avoid 'unknown' inference issues
      const permissionsArray: Permission[] = (Object.entries(roleForm.permissions) as [string, ResourceAction[]][])
          .filter(([_, actions]) => actions.length > 0)
          .map(([resourceId, actions]) => ({ resourceId, actions }));

      if (editingRole) {
          // Update
          setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, name: roleForm.name, description: roleForm.description, permissions: permissionsArray } : r));
      } else {
          // Create
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

  // --- USER MANAGEMENT LOGIC ---

  const handleCreateSystemUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    const employee = users.find(u => u.id === selectedEmployeeId);
    if (!employee) return;
    
    // Find selected role to get the UserRole enum fallback (mostly for types compatibility)
    const selectedRole = roles.find(r => r.id === userFormData.roleId);
    
    // Fallback mapping for the legacy enum
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

  // --- RENDER HELPERS ---
  
  const systemUsers = users.filter(u => u.isSystemUser);
  const availableEmployees = users.filter(u => !u.isSystemUser);

  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center glass-panel rounded-3xl m-8">
        <Lock className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Доступ ограничен</h2>
        <p className="text-slate-600">Только администраторы могут управлять настройками системы.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Настройки системы</h1>
          <p className="text-slate-600 font-medium">Управление пользователями, ролями и правами доступа</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="md:col-span-1 space-y-3">
           <button 
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'users' ? 'bg-white/60 text-blue-700 shadow-glass border border-white/40' : 'text-slate-600 hover:bg-white/30'}`}
            >
             <UserCheck size={20} />
             Пользователи
           </button>
           <button 
                onClick={() => setActiveTab('roles')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'roles' ? 'bg-white/60 text-blue-700 shadow-glass border border-white/40' : 'text-slate-600 hover:bg-white/30'}`}
            >
             <Shield size={20} />
             Роли и Права
           </button>
           <button 
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'security' ? 'bg-white/60 text-blue-700 shadow-glass border border-white/40' : 'text-slate-600 hover:bg-white/30'}`}
            >
             <Key size={20} />
             Безопасность
           </button>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3 space-y-6">
          
          {/* --- TAB: USERS --- */}
          {activeTab === 'users' && (
              <div className="glass-panel rounded-3xl overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-white/20 flex justify-between items-center bg-white/20">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Users size={20} className="text-blue-600" />
                    Список пользователей
                </h3>
                <button 
                    onClick={() => setIsUserModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-500/30 font-bold"
                    >
                    <Plus size={16} />
                    <span>Добавить</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/30 text-slate-500 border-b border-white/20">
                    <tr>
                        <th className="px-6 py-4 font-bold">Пользователь</th>
                        <th className="px-6 py-4 font-bold">Логин (Email)</th>
                        <th className="px-6 py-4 font-bold">Роль</th>
                        <th className="px-6 py-4 font-bold text-center">Статус</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                    {systemUsers.map(u => {
                        const userRoleName = roles.find(r => r.id === u.customRoleId)?.name || u.role;
                        return (
                        <tr key={u.id} className="hover:bg-white/20 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-xl shadow-sm" />
                                <div>
                                    <div className="font-bold text-slate-800">{u.name}</div>
                                    <div className="text-xs text-slate-500">{u.position}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {u.email || 'Не указан'}
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-lg text-xs font-bold uppercase bg-blue-100 text-blue-700">
                                {userRoleName}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
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
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 font-bold"
                      >
                        <Plus size={18} />
                        <span>Создать роль</span>
                      </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {roles.map(role => (
                          <div key={role.id} className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/60 transition-colors">
                              <div className="flex items-start gap-4">
                                  <div className={`p-4 rounded-2xl ${role.isSystem ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-600'} shadow-sm`}>
                                      <Shield size={24} />
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                          {role.name}
                                          {role.isSystem && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">System</span>}
                                      </h4>
                                      <p className="text-sm text-slate-500">{role.description}</p>
                                      <div className="mt-2 text-xs font-bold text-slate-400 bg-white/40 w-fit px-2 py-1 rounded-lg">
                                          Доступ к: {role.permissions.length} разделам
                                      </div>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => openRoleModal(role)}
                                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Редактировать права"
                                  >
                                      <Edit size={20} />
                                  </button>
                                  {!role.isSystem && (
                                    <button 
                                        onClick={() => deleteRole(role.id)}
                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Удалить роль"
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
              <div className="glass-panel p-12 rounded-3xl text-center animate-in fade-in">
                  <div className="inline-block p-6 bg-slate-100 rounded-full mb-6 shadow-inner">
                      <Lock size={40} className="text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">Журнал безопасности</h3>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">История входов и действий пользователей будет отображена здесь.</p>
                  <button className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-white/50 transition-colors font-bold">
                      Скачать логи (CSV)
                  </button>
              </div>
          )}

        </div>
      </div>

      {/* --- CREATE USER MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel bg-white/80 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50">
            <div className="p-6 border-b border-white/20 flex justify-between items-center bg-blue-50/50">
              <h2 className="text-xl font-extrabold text-blue-900 flex items-center gap-2">
                  <UserPlus size={24} />
                  Создание пользователя
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSystemUser} className="p-6 space-y-4">
              
              <div className="bg-yellow-50/70 p-4 rounded-2xl border border-yellow-100 mb-4">
                <label className="block text-sm font-bold text-yellow-800 mb-2">
                  1. Выберите сотрудника
                </label>
                <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                      required
                      value={selectedEmployeeId}
                      onChange={e => setSelectedEmployeeId(e.target.value)}
                      className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">-- Выберите из списка --</option>
                      {availableEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>
                      ))}
                    </select>
                </div>
              </div>

              <div className="pt-2 border-t border-white/20">
                <h3 className="text-sm font-bold text-slate-700 mb-3">2. Настройка доступа</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email (Логин)</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          required
                          type="email" 
                          value={userFormData.email}
                          onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                          className="glass-input w-full pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="employee@company.com"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Пароль</label>
                    <div className="relative">
                        <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          required
                          type="password" 
                          value={userFormData.password}
                          onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                          className="glass-input w-full pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="••••••••"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Роль в системе</label>
                    <select 
                      required
                      value={userFormData.roleId}
                      onChange={e => setUserFormData({...userFormData, roleId: e.target.value})}
                      className="glass-input w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Выберите роль...</option>
                      {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 hover:bg-white/50 rounded-xl transition-colors font-medium"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={!selectedEmployeeId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="glass-panel bg-white/90 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-8 max-h-[90vh] border border-white/50">
             <div className="p-6 border-b border-white/20 flex justify-between items-center bg-indigo-50/50">
              <h2 className="text-xl font-extrabold text-indigo-900 flex items-center gap-2">
                  <Shield size={24} />
                  {editingRole ? 'Редактирование роли' : 'Создание роли'}
              </h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleRoleSave} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 bg-white/40 border-b border-white/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Название роли</label>
                        <input 
                            required
                            type="text" 
                            value={roleForm.name}
                            onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                            className="glass-input w-full px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Например: Бухгалтер"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Описание</label>
                        <input 
                            type="text" 
                            value={roleForm.description}
                            onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                            className="glass-input w-full px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Краткое описание обязанностей"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <Folder size={18} className="text-slate-500"/>
                         Права доступа
                    </h3>
                    
                    <div className="border border-white/40 rounded-2xl overflow-hidden bg-white/40 shadow-sm backdrop-blur-sm">
                        {/* Header Row */}
                        <div className="flex items-center bg-slate-100/50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-white/40">
                            <div className="flex-1 px-6 py-4">Раздел</div>
                            {ACTIONS.map(action => (
                                <div key={action.id} className="w-[100px] text-center px-2 py-4">{action.label}</div>
                            ))}
                            <div className="w-[60px] text-center px-2 py-4">Все</div>
                        </div>

                        {/* Hierarchical Rows */}
                        <div className="divide-y divide-white/30">
                            {RESOURCE_TREE.map(section => {
                                const isExpanded = expandedSections.has(section.id);
                                return (
                                    <React.Fragment key={section.id}>
                                        {/* Section Header Row */}
                                        <div 
                                            className="flex items-center bg-white/20 hover:bg-white/40 cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-indigo-400"
                                            onClick={() => toggleSection(section.id)}
                                        >
                                            <div className="flex-1 px-4 py-4 flex items-center gap-2 font-bold text-slate-800">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                {section.label}
                                            </div>
                                            {/* Empty placeholders for actions on section header */}
                                            {ACTIONS.map(a => <div key={a.id} className="w-[100px]"></div>)}
                                            <div className="w-[60px]"></div>
                                        </div>

                                        {/* Child Rows */}
                                        {isExpanded && section.children?.map(child => {
                                            const resourcePerms = roleForm.permissions[child.id] || [];
                                            const isFull = resourcePerms.length === 4;

                                            return (
                                                <div key={child.id} className="flex items-center hover:bg-indigo-50/30 transition-colors animate-in fade-in slide-in-from-top-1 bg-white/10">
                                                    <div className="flex-1 px-4 py-3 pl-12 text-sm font-medium text-slate-700">
                                                        {child.label}
                                                    </div>
                                                    {ACTIONS.map(action => {
                                                        const isChecked = resourcePerms.includes(action.id);
                                                        return (
                                                            <div key={action.id} className="w-[100px] flex justify-center py-3 border-l border-white/20">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => togglePermission(child.id, action.id)}
                                                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="w-[60px] flex justify-center py-3 border-l border-white/20">
                                                        <button 
                                                            type="button"
                                                            onClick={() => toggleRowPermissions(child.id)}
                                                            className={`p-1.5 rounded-lg hover:bg-white/50 transition-colors ${isFull ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}
                                                            title={isFull ? 'Снять все' : 'Выбрать все'}
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/20 flex justify-end gap-3 bg-white/30">
                    <button 
                        type="button" 
                        onClick={() => setIsRoleModalOpen(false)}
                        className="px-6 py-2.5 bg-white/40 border border-white/50 text-slate-700 rounded-xl hover:bg-white/60 font-bold transition-colors"
                    >
                        Отмена
                    </button>
                    <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 font-bold transition-colors flex items-center gap-2"
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
