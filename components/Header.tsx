
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Bell, Search, Menu, ChevronDown, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  user: User;
  users: User[];
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onSwitchUser: (user: User) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, users, isDarkMode, onToggleTheme, onSwitchUser }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getRoleName = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Руководитель';
      case UserRole.MANAGER: return 'Менеджер';
      case UserRole.ENGINEER: return 'Инженер';
      default: return role;
    }
  };

  return (
    <header className="px-4 pt-4 md:px-6 md:pt-6 pb-2 z-20">
      <div className="glass-panel h-20 rounded-3xl px-6 flex items-center justify-between shadow-glass">
        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Поиск по системе..." 
              className="pl-12 pr-4 py-2.5 bg-white/40 border border-white/50 rounded-2xl text-sm focus:outline-none focus:bg-white/70 focus:ring-2 focus:ring-blue-400 w-full md:w-72 transition-all placeholder:text-slate-500 text-slate-800 dark:bg-slate-800/50 dark:border-slate-600 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={onToggleTheme}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all"
            title={isDarkMode ? "Включить светлую тему" : "Включить темную тему"}
          >
             {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          <button className="relative p-2.5 text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all">
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 shadow-glow animate-pulse"></span>
          </button>

          <div className="h-8 w-px bg-slate-300/50 dark:bg-slate-600/50 hidden sm:block"></div>

          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 focus:outline-none group p-1.5 rounded-2xl hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all"
            >
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.name}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{getRoleName(user.role)}</div>
              </div>
              <div className="relative">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className={`w-11 h-11 rounded-2xl border-2 shadow-sm object-cover transition-all ${isDropdownOpen ? 'border-blue-500 shadow-glow' : 'border-white dark:border-slate-700'}`}
                />
              </div>
              <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 hidden sm:block" />
            </button>
            
            {/* Click outside overlay */}
            {isDropdownOpen && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              ></div>
            )}
            
            {/* User Switcher Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-4 w-64 glass-panel rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300 border border-white/60 dark:border-slate-600">
                <div className="p-4 border-b border-white/20 bg-white/20 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Сменить пользователя</p>
                </div>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-colors ${user.id === u.id ? 'bg-blue-100/40 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-xl object-cover shadow-sm" />
                    <div>
                      <div className="text-sm font-bold">{u.name}</div>
                      <div className="text-xs opacity-70">{getRoleName(u.role)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
