
import React, { useState, useEffect } from 'react';
import { User, UserRole, Client, TimeEntry, AttendanceStatus, Advance, Task, Sale, MonthlyService } from './types';
import { USERS, CLIENTS, TIMESHEET, ADVANCES, TASKS, SALES, MONTHLY_SERVICES } from './mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { TasksPage } from './pages/TasksPage';
import { ClientsPage } from './pages/ClientsPage';
import { FinancePage } from './pages/FinancePage';
import { DocumentationPage } from './pages/DocumentationPage';
import { SettingsPage } from './pages/SettingsPage';
import { TimesheetPage } from './pages/TimesheetPage';
import { ServicePage } from './pages/ServicePage';
import { PublicTaskConfirmation } from './pages/PublicTaskConfirmation'; // Import public page
import { ShieldAlert } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ToastProvider } from './components/Toast';

// Simple Hash Router Implementation
const App: React.FC = () => {
  // --- Global State with Persistence ---
  const [users, setUsers] = useLocalStorage<User[]>('crm_users', USERS);
  const [currentUser, setCurrentUser] = useState<User>(users[0]); // Session state only
  const [clients, setClients] = useLocalStorage<Client[]>('crm_clients', CLIENTS);
  
  // Theme State
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('crm_theme', 'light');

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  // Lifted Data for Dashboard & Pages Sync
  const [tasks, setTasks] = useLocalStorage<Task[]>('crm_tasks', TASKS);
  const [sales, setSales] = useLocalStorage<Sale[]>('crm_sales', SALES);
  const [monthlyServices, setMonthlyServices] = useLocalStorage<MonthlyService[]>('crm_services', MONTHLY_SERVICES);
  
  // HR Data
  const [timesheetData, setTimesheetData] = useLocalStorage<TimeEntry[]>('crm_timesheet', TIMESHEET);
  const [advances, setAdvances] = useLocalStorage<Advance[]>('crm_advances', ADVANCES);

  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || '#dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (hash: string) => {
    window.location.hash = hash;
  };

  // --- PUBLIC ROUTE HANDLING ---
  if (currentHash.startsWith('#public-task')) {
      return <PublicTaskConfirmation />;
  }

  // --- Handlers ---

  const handleAddClient = (client: Client) => {
    setClients(prev => [client, ...prev]);
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    // Update current user if it's the one being edited
    if (currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
  };

  const handleAddAdvance = (advance: Advance) => {
    setAdvances(prev => [advance, ...prev]);
  };

  // --- Time Tracking Logic ---
  const handleCheckIn = (location?: { lat: number, lng: number }) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Check if entry already exists
    const existingEntry = timesheetData.find(t => t.userId === currentUser.id && t.date === today);

    if (existingEntry) {
      setTimesheetData(prev => prev.map(t => 
        t.id === existingEntry.id 
          ? { ...t, status: AttendanceStatus.PRESENT, checkIn: now, totalHours: 0, location } 
          : t
      ));
    } else {
      const newEntry: TimeEntry = {
        id: `te_${Date.now()}`,
        userId: currentUser.id,
        date: today,
        status: AttendanceStatus.PRESENT,
        checkIn: now,
        totalHours: 0, 
        location
      };
      setTimesheetData(prev => [...prev, newEntry]);
    }
  };

  const handleCheckOut = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    setTimesheetData(prev => prev.map(t => {
      if (t.userId === currentUser.id && t.date === today) {
        let hours = 8; 
        if (t.checkIn) {
             const [h1, m1] = t.checkIn.split(':').map(Number);
             const [h2, m2] = now.split(':').map(Number);
             const diff = (h2 + m2/60) - (h1 + m1/60);
             hours = Math.max(0, parseFloat(diff.toFixed(2)));
        }

        return { 
          ...t, 
          checkOut: now,
          totalHours: Math.round(hours) 
        };
      }
      return t;
    }));
  };

  const updateTimesheetEntry = (updatedEntry: TimeEntry) => {
     setTimesheetData(prev => {
         const exists = prev.find(t => t.id === updatedEntry.id);
         if (exists) {
             return prev.map(t => t.id === updatedEntry.id ? updatedEntry : t);
         }
         return [...prev, updatedEntry];
     });
  };
  
  const deleteTimesheetEntry = (id: string) => {
      setTimesheetData(prev => prev.filter(t => t.id !== id));
  };

  // --- ACCESS CONTROL ---
  const isAccessAllowed = (route: string, role: UserRole): boolean => {
    switch (route) {
      case 'dashboard':
      case 'tasks':
      case 'docs':
        return true; 
      case 'employees':
        return role === UserRole.ADMIN || role === UserRole.MANAGER; // Restrict Engineer
      case 'clients':
      case 'service':
        return role === UserRole.ADMIN || role === UserRole.MANAGER;
      case 'finance':
      case 'settings':
        return role === UserRole.ADMIN;
      default:
        return true;
    }
  };

  const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 glass-panel rounded-3xl m-8">
      <div className="bg-red-100/50 p-4 rounded-full mb-4">
        <ShieldAlert size={48} className="text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Доступ запрещен</h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md">
        У вашей учетной записи ({currentUser.role}) недостаточно прав для просмотра этого раздела.
      </p>
      <button 
        onClick={() => navigate('#dashboard')}
        className="mt-6 px-6 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl backdrop-blur-md transition-all shadow-lg hover:shadow-blue-500/30"
      >
        Вернуться на Дашборд
      </button>
    </div>
  );

  const renderContent = () => {
    const route = currentHash.replace('#', '');
    
    if (!isAccessAllowed(route, currentUser.role)) {
      return <AccessDenied />;
    }

    switch (route) {
      case 'dashboard':
        return (
          <Dashboard 
            user={currentUser} 
            timesheetData={timesheetData}
            advances={advances} // Added advances prop
            tasks={tasks}
            sales={sales}
            monthlyServices={monthlyServices}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onUpdateTasks={setTasks} // Pass setTasks to Dashboard
          />
        );
      case 'tasks':
        return (
          <TasksPage 
            user={currentUser} 
            users={users} 
            clients={clients} 
            tasks={tasks}
            onUpdateTasks={setTasks}
            onAddClient={handleAddClient}
          />
        );
      case 'clients':
        return (
          <ClientsPage 
            user={currentUser} 
            clients={clients} 
            tasks={tasks} // Pass Tasks
            sales={sales} // Pass Sales
            onAddClient={handleAddClient} 
          />
        );
      case 'service':
        return (
          <ServicePage 
            user={currentUser} 
            clients={clients} 
            monthlyServices={monthlyServices}
            tasks={tasks} // Pass tasks
            onUpdateTasks={setTasks} // Pass setter
            onUpdateServices={setMonthlyServices}
            onAddClient={handleAddClient} 
          />
        );
      case 'finance':
        return <FinancePage user={currentUser} />;
      case 'employees': 
        return (
          <TimesheetPage 
            user={currentUser} 
            users={users} 
            timesheetData={timesheetData}
            advances={advances}
            onUpdateEntry={updateTimesheetEntry}
            onDeleteEntry={deleteTimesheetEntry}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onAddAdvance={handleAddAdvance}
          />
        ); 
      case 'docs':
        return <DocumentationPage />;
      case 'settings':
        return (
          <SettingsPage 
            user={currentUser} 
            users={users} 
            onUpdateUser={handleUpdateUser} 
          />
        );
      default:
        return (
            <Dashboard 
              user={currentUser} 
              timesheetData={timesheetData}
              advances={advances} // Added advances prop
              tasks={tasks}
              sales={sales}
              monthlyServices={monthlyServices}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onUpdateTasks={setTasks} // Pass setTasks to Dashboard
            />
          );
    }
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
        <Sidebar 
          role={currentUser.role} 
          currentRoute={currentHash.replace('#', '')} 
          onNavigate={navigate} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          <Header 
            user={currentUser} 
            users={users} 
            isDarkMode={theme === 'dark'}
            onToggleTheme={toggleTheme}
            onSwitchUser={(u) => {
              setCurrentUser(u);
              if (!isAccessAllowed(currentHash.replace('#', ''), u.role)) {
                navigate('#dashboard');
              }
            }} 
          />
          
          {/* Main content padding bottom added for mobile nav */}
          <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 scroll-smooth">
            {renderContent()}
          </main>
          
          {/* Mobile Navigation */}
          <BottomNav 
            role={currentUser.role} 
            currentRoute={currentHash.replace('#', '')} 
            onNavigate={navigate} 
          />
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;
