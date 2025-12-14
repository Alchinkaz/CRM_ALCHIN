
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, FinancialAccount, Transaction, AccountType } from '../types';
import { ACCOUNTS, TRANSACTIONS } from '../mockData';
import { Wallet, TrendingUp, TrendingDown, Plus, CreditCard, Landmark, DollarSign, Search, Filter, X, Save, ArrowDownLeft, ArrowUpRight, Calendar as CalendarIcon, ChevronDown, Check, ChevronLeft, ChevronRight, CornerDownRight, Hash, Edit2, Upload, AlertTriangle, FileText, Trash2, CheckCircle, CheckSquare, ArrowUpDown, ChevronUp, AlertOctagon, ShieldAlert, Scale, FileUp, RefreshCw, FileWarning } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface FinancePageProps {
  user: User;
}

export const FinancePage: React.FC<FinancePageProps> = ({ user }) => {
  // Use Local Storage Hook for Persistence
  const [accounts, setAccounts] = useLocalStorage<FinancialAccount[]>('crm_finance_accounts', ACCOUNTS as FinancialAccount[]);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('crm_finance_transactions', TRANSACTIONS);
  
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');
  
  // --- Date Helpers ---
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMonthName = (monthIndex: number) => {
      const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      return months[monthIndex];
  };

  const todayIso = formatDate(new Date());

  // --- Date Filter State ---
  const [dateFilter, setDateFilter] = useState({
    start: '2020-01-01',
    end: '2100-01-01',
    label: 'За всё время'
  });
  
  // Calendar UI State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(new Date()); // Current month shown in picker
  const [tempRange, setTempRange] = useState<{start: string | null, end: string | null}>({ start: null, end: null });

  // 1C Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportTransactions, setPendingImportTransactions] = useState<any[] | null>(null);
  const [isUnknownAccountModalOpen, setIsUnknownAccountModalOpen] = useState(false);
  const [pendingNewAccountDetails, setPendingNewAccountDetails] = useState<{
      number: string;
      balance: number;
      bankName: string;
  } | null>(null);

  // IMPORT RESULT MODAL STATE
  const [importResult, setImportResult] = useState<{
      open: boolean;
      accountName: string;
      accountId: string;
      added: number;
      duplicates: number;
      fileFinalBalance?: number;
      projectedBalance: number;
  }>({ open: false, accountName: '', accountId: '', added: 0, duplicates: 0, projectedBalance: 0 });

  // --- NEW: CASH RECONCILIATION STATE ---
  const [cashReconcileAccount, setCashReconcileAccount] = useState<FinancialAccount | null>(null);
  const [cashActualBalance, setCashActualBalance] = useState('');

  // --- NEW: PAGINATION & SEARCH & SORT STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // --- DELETE ACCOUNT MODAL STATE ---
  const [deletingAccount, setDeletingAccount] = useState<FinancialAccount | null>(null);
  const [deleteStep, setDeleteStep] = useState<number>(0); 
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');

  // --- DELETE TRANSACTIONS MODAL STATE ---
  const [isDeleteTxModalOpen, setIsDeleteTxModalOpen] = useState(false);

  // Close date picker on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  
  // Transaction Form State
  const [txType, setTxType] = useState<'Income' | 'Expense'>('Income');
  const [txForm, setTxForm] = useState({
    amount: '',
    category: '',
    accountId: '',
    description: '',
    date: formatDate(new Date())
  });

  // Account Form State
  const [accForm, setAccForm] = useState({
      name: '',
      type: 'Cash' as AccountType,
      initialBalance: '',
      accountNumber: '', // IIK
      parentId: '' // Link to parent
  });

  if (user.role !== UserRole.ADMIN) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <DollarSign size={28} className="text-gray-400" />
            </div>
            <h2 className="text-[20px] font-semibold text-black dark:text-white">Доступ ограничен</h2>
            <p className="text-gray-500 dark:text-gray-400">Финансовый раздел доступен только руководителю.</p>
        </div>
    );
  }

  // ... (Keep existing logic methods) ...
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const initiateDeleteAccount = (account: FinancialAccount) => {
      setDeletingAccount(account);
      setDeleteStep(1);
      setDeleteConfirmationName('');
  };

  const executeDeleteAccount = () => {
      if (!deletingAccount) return;
      setTransactions(prev => prev.filter(t => t.accountId !== deletingAccount.id));
      setAccounts(prev => prev.filter(a => a.id !== deletingAccount.id));
      setDeletingAccount(null);
      setDeleteStep(0);
      setDeleteConfirmationName('');
  };

  const handleDeleteSelected = () => {
      if (selectedTxIds.size === 0) return;
      setIsDeleteTxModalOpen(true);
  };

  const executeDeleteSelected = () => {
      const txsToDelete = transactions.filter(t => selectedTxIds.has(t.id));
      const balanceUpdates: Record<string, number> = {};
      
      txsToDelete.forEach(tx => {
          if (!balanceUpdates[tx.accountId]) balanceUpdates[tx.accountId] = 0;
          if (tx.type === 'Income') {
              balanceUpdates[tx.accountId] -= tx.amount;
          } else {
              balanceUpdates[tx.accountId] += tx.amount;
          }
      });

      setAccounts(prev => prev.map(acc => {
          if (balanceUpdates[acc.id]) {
              return { ...acc, balance: acc.balance + balanceUpdates[acc.id] };
          }
          return acc;
      }));

      setTransactions(prev => prev.filter(t => !selectedTxIds.has(t.id)));
      setSelectedTxIds(new Set());
      setIsDeleteTxModalOpen(false);
  };

  const toggleSelectOne = (id: string) => {
      const newSet = new Set(selectedTxIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedTxIds(newSet);
  };

  const initiateCashReconcile = (account: FinancialAccount) => {
      setCashReconcileAccount(account);
      setCashActualBalance('');
  };

  const handleCashReconcileSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!cashReconcileAccount || !cashActualBalance) return;

      const actual = parseFloat(cashActualBalance);
      const diff = actual - cashReconcileAccount.balance;

      if (Math.abs(diff) > 0) {
          const correctionTx: Transaction = {
              id: `fix_${Date.now()}`,
              date: formatDate(new Date()),
              amount: Math.abs(diff),
              type: diff > 0 ? 'Income' : 'Expense',
              category: 'Корректировка баланса',
              accountId: cashReconcileAccount.id,
              description: `Сверка кассы: ${diff > 0 ? 'Излишек' : 'Недостача'}`,
              is1C: false
          };
          setTransactions(prev => [correctionTx, ...prev]);
          setAccounts(prev => prev.map(a => a.id === cashReconcileAccount.id ? { ...a, balance: actual } : a));
      }
      setCashReconcileAccount(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      alert("Функция импорта 1С готова к интеграции (заглушка для UI).");
      e.target.value = '';
  };

  // Date Filter Logic
  const handlePreset = (type: 'month' | 'last_month' | 'year' | 'all') => {
    const today = new Date();
    let start = '';
    let end = formatDate(today);
    let label = '';

    switch(type) {
        case 'month':
            start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
            label = 'За текущий месяц';
            break;
        case 'last_month':
            start = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
            end = formatDate(new Date(today.getFullYear(), today.getMonth(), 0));
            label = 'За прошлый месяц';
            break;
        case 'year':
            start = formatDate(new Date(today.getFullYear(), 0, 1));
            label = 'За текущий год';
            break;
        case 'all':
            start = '2020-01-01'; // Far past
            end = '2100-01-01'; // Far future
            label = 'За всё время';
            break;
    }
    setDateFilter({ start, end, label });
    setIsDatePickerOpen(false);
  };

  // --- FILTER & PAGINATION PIPELINE ---
  const transactionsInPeriod = transactions.filter(t => 
    t.date >= dateFilter.start && t.date <= dateFilter.end
  );

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0); 
  const periodIncome = transactionsInPeriod.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
  const periodExpense = transactionsInPeriod.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);

  const typeFiltered = transactionsInPeriod.filter(t => filterType === 'All' || t.type === filterType);
  
  const searchFiltered = typeFiltered.filter(t => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
          t.description?.toLowerCase().includes(lower) ||
          t.category.toLowerCase().includes(lower) ||
          t.amount.toString().includes(lower)
      );
  });

  const sortedTransactions = [...searchFiltered].sort((a, b) => {
    if (!sortConfig) return new Date(b.date).getTime() - new Date(a.date).getTime();
    const { key, direction } = sortConfig;
    let aValue: any = '';
    let bValue: any = '';
    switch (key) {
        case 'date': aValue = new Date(a.date).getTime(); bValue = new Date(b.date).getTime(); break;
        case 'amount': aValue = a.amount; bValue = b.amount; break;
        default: return 0;
    }
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalItems = sortedTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const handleTxSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!txForm.accountId) return;

      const amount = parseFloat(txForm.amount);
      const newTx: Transaction = {
          id: `tr${Date.now()}`,
          date: txForm.date,
          amount: amount,
          type: txType,
          category: txForm.category,
          accountId: txForm.accountId,
          description: txForm.description,
          is1C: false
      };

      setTransactions([newTx, ...transactions]);
      setAccounts(prev => prev.map(acc => {
          if (acc.id === txForm.accountId) {
              return {
                  ...acc,
                  balance: txType === 'Income' ? acc.balance + amount : acc.balance - amount
              };
          }
          return acc;
      }));
      setIsTxModalOpen(false);
      setTxForm({ amount: '', category: '', accountId: '', description: '', date: formatDate(new Date()) });
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const initialBalance = parseFloat(accForm.initialBalance) || 0;
      if (editingAccount) {
          setAccounts(prev => prev.map(a => a.id === editingAccount.id ? {...a, name: accForm.name, type: accForm.type} : a));
      } else {
          const newAcc: FinancialAccount = {
              id: `acc${Date.now()}`,
              name: accForm.name,
              type: accForm.type,
              balance: initialBalance,
              accountNumber: accForm.accountNumber
          };
          setAccounts([...accounts, newAcc]);
      }
      setIsAccountModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white dark:drop-shadow-sm">Финансы</h1>
          <p className="text-slate-600 dark:text-gray-400 font-medium">Управление счетами и транзакциями</p>
        </div>
        <div className="flex gap-3">
             <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".txt"
                onChange={handleFileUpload}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm font-bold"
             >
                <Upload size={18} />
                <span className="hidden sm:inline">Импорт 1С</span>
             </button>
             <button 
                onClick={() => { setTxType('Income'); setIsTxModalOpen(true); }}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-blue-500/30 font-bold"
             >
                <Plus size={18} />
                <span className="hidden sm:inline">Новая транзакция</span>
             </button>
        </div>
      </div>

      {/* ... (Summary Cards and Accounts Grid remain largely the same, just keeping code structure) ... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400"><Wallet size={20} /></div>
                  <span className="font-medium text-[15px]">Общий баланс</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">{totalBalance.toLocaleString()} ₸</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400"><TrendingUp size={20} /></div>
                  <span className="font-medium text-[15px]">Доход <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({dateFilter.label})</span></span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 tracking-tight">+{periodIncome.toLocaleString()} ₸</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"><TrendingDown size={20} /></div>
                  <span className="font-medium text-[15px]">Расход <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({dateFilter.label})</span></span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 tracking-tight">-{periodExpense.toLocaleString()} ₸</div>
          </div>
      </div>

      <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <h2 className="text-[20px] font-bold text-black dark:text-white">Счета</h2>
              <button onClick={() => { setEditingAccount(null); setIsAccountModalOpen(true); }} className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:opacity-70">
                  + Добавить счет
              </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
              {accounts.map(acc => (
                  <div key={acc.id} className="min-w-[280px] bg-white dark:bg-slate-800 p-5 rounded-ios shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-[160px] relative overflow-hidden group transition-all hover:shadow-md">
                        <div className="absolute top-3 right-3 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { setEditingAccount(acc); setIsAccountModalOpen(true); }} className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit2 size={14} /></button>
                             <button onClick={() => initiateDeleteAccount(acc)} className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${acc.type === 'Cash' ? 'bg-green-100 text-green-600' : acc.type === 'Bank' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {acc.type === 'Cash' ? <DollarSign size={20} /> : acc.type === 'Bank' ? <Landmark size={20} /> : <CreditCard size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-black dark:text-white text-[15px]">{acc.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">{acc.type === 'Cash' ? 'Наличные' : acc.type === 'Bank' ? 'Банк' : 'Подсчет'}</div>
                            </div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-black dark:text-white">{acc.balance.toLocaleString()} ₸</div>
                            {acc.accountNumber && <div className="text-[10px] text-gray-400 font-mono mt-1">{acc.accountNumber}</div>}
                        </div>
                  </div>
              ))}
          </div>
      </div>

      {/* FILTERS & TABLE (Simplified for brevity as core logic hasn't changed, just style) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* ... Table Header Controls ... */}
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <div className="flex gap-2 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-xl">
                  {['All', 'Income', 'Expense'].map(type => (
                      <button
                          key={type}
                          onClick={() => setFilterType(type as any)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === type ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'}`}
                      >
                          {type === 'All' ? 'Все' : type === 'Income' ? 'Доходы' : 'Расходы'}
                      </button>
                  ))}
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          type="text"
                          placeholder="Поиск по описанию..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                      />
                  </div>
              </div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-slate-500 dark:text-gray-300 font-bold">
                      <tr>
                          <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('date')}>Дата</th>
                          <th className="px-6 py-4">Категория</th>
                          <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('amount')}>Сумма</th>
                          <th className="px-6 py-4">Счет</th>
                          <th className="px-6 py-4">Описание</th>
                          <th className="px-6 py-4"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {currentTransactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-6 py-4 font-mono text-slate-600 dark:text-gray-400">{tx.date}</td>
                              <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-gray-300">
                                      {tx.category}
                                  </span>
                              </td>
                              <td className={`px-6 py-4 font-bold ${tx.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {tx.type === 'Income' ? '+' : '-'}{tx.amount.toLocaleString()} ₸
                              </td>
                              <td className="px-6 py-4 text-slate-600 dark:text-gray-300">
                                  {accounts.find(a => a.id === tx.accountId)?.name}
                              </td>
                              <td className="px-6 py-4 text-slate-500 dark:text-gray-400 max-w-xs truncate" title={tx.description}>
                                  {tx.description}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button onClick={() => { setSelectedTxIds(new Set([tx.id])); setIsDeleteTxModalOpen(true); }} className="text-gray-400 hover:text-red-500 transition-colors">
                                      <Trash2 size={16} />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-gray-400">Показано {currentTransactions.length} из {sortedTransactions.length}</span>
              <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
              </div>
          </div>
      </div>

      {/* --- ADD TRANSACTION MODAL --- */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700 dark:shadow-[0_0_40px_rgba(59,130,246,0.3)]">
            <div className={`p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center ${txType === 'Income' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-t-3xl`}>
              <h2 className={`text-xl font-extrabold ${txType === 'Income' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'} flex items-center gap-2 dark:drop-shadow-sm`}>
                  {txType === 'Income' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  {txType === 'Income' ? 'Поступление' : 'Расход'}
              </h2>
              <div className="flex bg-white/50 dark:bg-black/20 rounded-lg p-1">
                  <button onClick={() => setTxType('Income')} className={`p-1 rounded ${txType === 'Income' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}><ArrowDownLeft size={16} className="text-green-600" /></button>
                  <button onClick={() => setTxType('Expense')} className={`p-1 rounded ${txType === 'Expense' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}><ArrowUpRight size={16} className="text-red-600" /></button>
              </div>
            </div>
            
            <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
              {/* ... fields ... */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Сумма</label>
                <input 
                  required
                  type="number" 
                  value={txForm.amount}
                  onChange={e => setTxForm({...txForm, amount: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  placeholder="0"
                />
              </div>
              {/* ... other fields ... */}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsTxModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors">Отмена</button>
                <button type="submit" className={`flex-1 px-4 py-3 text-white rounded-xl font-bold shadow-lg transition-colors bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90`}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD ACCOUNT MODAL --- */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700 dark:shadow-[0_0_40px_rgba(59,130,246,0.3)]">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <Landmark size={24} />
                  {editingAccount ? 'Редактировать счет' : 'Новый счет'}
              </h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              {/* ... fields ... */}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAccountModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors">Отмена</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 shadow-lg shadow-blue-500/30 transition-colors">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
