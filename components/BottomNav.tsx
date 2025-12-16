
import React from 'react';
import { UserRole } from '../types';
import { LayoutDashboard, Wrench, Users, Car, Banknote, User, MessageCircle } from 'lucide-react';

interface BottomNavProps {
  role: UserRole;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role, currentRoute, onNavigate }) => {
  // Mobile typically has fewer items (3-5 max)
  const allItems = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'chat', label: 'Чат', icon: MessageCircle, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'tasks', label: 'Заявки', icon: Wrench, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'employees', label: 'Табель', icon: Users, roles: [UserRole.ADMIN, UserRole.MANAGER] }, // Removed ENGINEER
    { id: 'finance', label: 'Финансы', icon: Banknote, roles: [UserRole.ADMIN] },
    { id: 'service', label: 'Сервис', icon: Car, roles: [UserRole.MANAGER] },
  ];

  // Filter based on role
  const visibleItems = allItems.filter(item => item.roles.includes(role)).slice(0, 5); 
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50 pb-safe select-none">
      <div className="flex justify-around items-center h-full px-2">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors cursor-pointer ${
                isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
