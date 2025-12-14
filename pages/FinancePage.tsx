
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

  // --- Date Filter State (CHANGED DEFAULT) ---
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
  
  // New State for the intermediate "Account Not Found" modal
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
      accountId: string; // Needed for correction
      added: number;
      duplicates: number;
      fileFinalBalance?: number; // From 1C file
      projectedBalance: number; // Current System Balance + Added Txs
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
  const [deleteStep, setDeleteStep] = useState<number>(0); // 0 = closed, 1 = warning, 2 = danger, 3 = final input
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

  // Sync temp range when opening
  useEffect(() => {
      if (isDatePickerOpen) {
          setTempRange({ start: dateFilter.start, end: dateFilter.end });
          setViewDate(new Date()); // Open on current date month
      }
  }, [isDatePickerOpen]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
      setSelectedTxIds(new Set()); // Clear selection on filter change to avoid confusion
  }, [dateFilter, filterType, searchTerm, itemsPerPage, sortConfig]);

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

  // --- Logic ---

  // Sort Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Delete Account Start
  const initiateDeleteAccount = (account: FinancialAccount) => {
      setDeletingAccount(account);
      setDeleteStep(1);
      setDeleteConfirmationName('');
  };

  // Delete Account Final Execution
  const executeDeleteAccount = () => {
      if (!deletingAccount) return;

      // 1. Delete all transactions linked to this account
      setTransactions(prev => prev.filter(t => t.accountId !== deletingAccount.id));

      // 2. Delete the account itself
      setAccounts(prev => prev.filter(a => a.id !== deletingAccount.id));

      // 3. Reset state
      setDeletingAccount(null);
      setDeleteStep(0);
      setDeleteConfirmationName('');
  };

  // Bulk Delete Transactions - ENTRY
  const handleDeleteSelected = () => {
      if (selectedTxIds.size === 0) return;
      setIsDeleteTxModalOpen(true);
  };

  // Bulk Delete Transactions - EXECUTE
  const executeDeleteSelected = () => {
      // Calculate impact on balances before deleting
      const txsToDelete = transactions.filter(t => selectedTxIds.has(t.id));
      
      // Group balance updates by account
      const balanceUpdates: Record<string, number> = {};
      
      txsToDelete.forEach(tx => {
          if (!balanceUpdates[tx.accountId]) balanceUpdates[tx.accountId] = 0;
          // Reverting transaction: subtract Income, add Expense
          if (tx.type === 'Income') {
              balanceUpdates[tx.accountId] -= tx.amount;
          } else {
              balanceUpdates[tx.accountId] += tx.amount;
          }
      });

      // Update Accounts
      setAccounts(prev => prev.map(acc => {
          if (balanceUpdates[acc.id]) {
              return { ...acc, balance: acc.balance + balanceUpdates[acc.id] };
          }
          return acc;
      }));

      // Remove Transactions
      setTransactions(prev => prev.filter(t => !selectedTxIds.has(t.id)));
      setSelectedTxIds(new Set());
      setIsDeleteTxModalOpen(false);
  };

  // Toggle Selection
  const toggleSelectOne = (id: string) => {
      const newSet = new Set(selectedTxIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedTxIds(newSet);
  };

  // --- Cash Reconciliation Logic ---
  const initiateCashReconcile = (account: FinancialAccount) => {
      setCashReconcileAccount(account);
      setCashActualBalance(''); // Reset input
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

  // --- 1C Import Reconciliation Logic ---
  const applyImportCorrection = () => {
      if (!importResult.fileFinalBalance && importResult.fileFinalBalance !== 0) return;
      if (importResult.fileFinalBalance === importResult.projectedBalance) return;

      const diff = importResult.fileFinalBalance - importResult.projectedBalance;
      
      const correctionTx: Transaction = {
          id: `imp_fix_${Date.now()}`,
          date: formatDate(new Date()),
          amount: Math.abs(diff),
          type: diff > 0 ? 'Income' : 'Expense',
          category: 'Корректировка по выписке',
          accountId: importResult.accountId,
          description: `Авто-корректировка при импорте. Выписка: ${importResult.fileFinalBalance}, Расчетный: ${importResult.projectedBalance}`,
          is1C: true
      };

      setTransactions(prev => [correctionTx, ...prev]);
      setAccounts(prev => prev.map(a => a.id === importResult.accountId ? { ...a, balance: importResult.fileFinalBalance! } : a));
      
      // Close modal
      setImportResult({...importResult, open: false});
  };

  // ... (Keep 1C Parsing Logic as is)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          parse1CFile(text);
      };
      reader.readAsText(file); 
      e.target.value = '';
  };

  const parse1CFile = (text: string) => {
      const lines = text.split('\n');
      let currentSection = '';
      let accountInfo: any = {};
      let documents: any[] = [];
      let currentDoc: any = {};

      for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const upperLine = trimmed.toUpperCase();
          if (upperLine.startsWith('СЕКЦИЯРАСЧСЧЕТ')) { currentSection = 'account'; continue; }
          else if (upperLine.startsWith('КОНЕЦРАСЧСЧЕТ')) { currentSection = ''; continue; }
          else if (upperLine.startsWith('СЕКЦИЯДОКУМЕНТ')) { currentSection = 'document'; continue; }
          else if (upperLine.startsWith('КОНЕЦДОКУМЕНТА')) { documents.push(currentDoc); currentDoc = {}; currentSection = ''; continue; }

          const [rawKey, ...values] = trimmed.split('=');
          const key = rawKey.trim().toUpperCase(); 
          const value = values.join('=').trim(); 

          if (currentSection === 'account') {
              if (key === 'РАСЧСЧЕТ') accountInfo.number = value;
              if (key === 'НАЧАЛЬНЫЙОСТАТОК') accountInfo.initialBalance = parseFloat(value);
              if (key === 'КОНЕЧНЫЙОСТАТОК') accountInfo.finalBalance = parseFloat(value);
          } else if (currentSection === 'document') {
              currentDoc[key] = value;
          } else if (!currentSection && key === 'РАСЧСЧЕТ') {
              if (!accountInfo.number) accountInfo.number = value;
          }
      }

      if (accountInfo.number) {
          const existingAccount = accounts.find(a => a.accountNumber === accountInfo.number);
          if (existingAccount) {
              const { newTransactions } = getTransactionsFromDocs(documents, existingAccount.id, accountInfo.number);
              const totalFound = newTransactions.length;
              if (totalFound === 0) { alert(`В файле не найдено транзакций для счета "${existingAccount.name}".`); return; }

              const uniqueTransactions = newTransactions.filter(newTx => {
                  return !transactions.some(existingTx => 
                      existingTx.accountId === newTx.accountId &&
                      existingTx.amount === newTx.amount &&
                      existingTx.date === newTx.date &&
                      existingTx.type === newTx.type &&
                      (existingTx.description || '').trim() === (newTx.description || '').trim()
                  );
              });

              const addedCount = uniqueTransactions.length;
              const duplicateCount = totalFound - addedCount;
              
              const transactionDelta = uniqueTransactions.reduce((acc, tx) => acc + (tx.type === 'Income' ? tx.amount : -tx.amount), 0);
              const newProjectedBalance = existingAccount.balance + transactionDelta;

              if (addedCount > 0) {
                  setTransactions(prev => [...uniqueTransactions, ...prev]);
                  setAccounts(prev => prev.map(a => a.id === existingAccount.id ? { ...a, balance: newProjectedBalance } : a));
              }
              
              setImportResult({ 
                  open: true, 
                  accountName: existingAccount.name, 
                  accountId: existingAccount.id,
                  added: addedCount, 
                  duplicates: duplicateCount,
                  fileFinalBalance: accountInfo.finalBalance, // From file
                  projectedBalance: newProjectedBalance // System calculated
              });
          } else {
              // ... (Same as before: Unknown Account logic)
              let bankName = 'Банковский счет';
              const foundBank = documents.find(d => (d['ПЛАТЕЛЬЩИКИИК'] === accountInfo.number && d['ПЛАТЕЛЬЩИКБАНКНАИМЕНОВАНИЕ']) || (d['ПОЛУЧАТЕЛЬИИК'] === accountInfo.number && d['ПОЛУЧАТЕЛЬБАНКНАИМЕНОВАНИЕ']));
              if (foundBank) {
                  if (foundBank['ПЛАТЕЛЬЩИКИИК'] === accountInfo.number) bankName = foundBank['ПЛАТЕЛЬЩИКБАНКНАИМЕНОВАНИЕ'];
                  else bankName = foundBank['ПОЛУЧАТЕЛЬБАНКНАИМЕНОВАНИЕ'];
              }
              setPendingImportTransactions(documents);
              setPendingNewAccountDetails({ number: accountInfo.number, balance: accountInfo.initialBalance || 0, bankName: bankName });
              setIsUnknownAccountModalOpen(true);
          }
      } else { alert('Не удалось определить номер счета в файле выписки.'); }
  };

  const proceedToCreateAccount = () => {
      if (!pendingNewAccountDetails) return;
      setEditingAccount(null);
      setAccForm({
          name: pendingNewAccountDetails.bankName || `Счет ${pendingNewAccountDetails.number.slice(-4)}`,
          type: 'Bank',
          initialBalance: pendingNewAccountDetails.balance.toString(),
          accountNumber: pendingNewAccountDetails.number,
          parentId: ''
      });
      setIsUnknownAccountModalOpen(false);
      setIsAccountModalOpen(true);
  };

  const getTransactionsFromDocs = (docs: any[], accountId: string, myAccountNumber?: string) => {
      const newTransactions: Transaction[] = [];
      let totalDelta = 0;
      docs.forEach(doc => {
          let amount = 0;
          let type: 'Income' | 'Expense' | null = null;
          const sumIn = doc['СУММАПРИХОД']; 
          const sumOut = doc['СУММАРАСХОД'];
          const sumGeneral = doc['СУММА'];

          if (sumIn && parseFloat(sumIn) > 0) { amount = parseFloat(sumIn); type = 'Income'; } 
          else if (sumOut && parseFloat(sumOut) > 0) { amount = parseFloat(sumOut); type = 'Expense'; } 
          else if (sumGeneral && parseFloat(sumGeneral) > 0 && myAccountNumber) {
              const payerIIK = doc['ПЛАТЕЛЬЩИКИИК'];
              const receiverIIK = doc['ПОЛУЧАТЕЛЬИИК'];
              const val = parseFloat(sumGeneral);
              if (payerIIK === myAccountNumber) { type = 'Expense'; amount = val; } 
              else if (receiverIIK === myAccountNumber) { type = 'Income'; amount = val; }
          }

          if (!type || amount === 0) return;

          const dateStr = doc['ДАТАДОКУМЕНТА'] || doc['ДАТАОПЕРАЦИИ'];
          let dateIso = formatDate(new Date());
          if (dateStr) {
             const dateParts = dateStr.split('.');
             if (dateParts.length === 3) dateIso = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          }

          const payer = doc['ПЛАТЕЛЬЩИКНАИМЕНОВАНИЕ'] || 'Неизвестный плательщик';
          const receiver = doc['ПОЛУЧАТЕЛЬНАИМЕНОВАНИЕ'] || 'Неизвестный получатель';
          const purpose = doc['НАЗНАЧЕНИЕПЛАТЕЖА'] || '';
          const counterparty = type === 'Income' ? payer : receiver;
          const description = purpose.length > 100 ? purpose.substring(0, 100) + '...' : purpose;
          const docNum = doc['НОМЕРДОКУМЕНТА'] || Math.random().toString(36).substr(2, 5);

          newTransactions.push({
              id: `1c_${docNum}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              date: dateIso,
              amount: amount,
              type: type,
              category: type === 'Income' ? 'Поступление' : 'Расход',
              accountId: accountId,
              description: `${counterparty}. ${description}`,
              is1C: true
          });
          totalDelta += (type === 'Income' ? amount : -amount);
      });
      return { newTransactions, totalDelta };
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

  const handleDateClick = (dayStr: string) => {
      if (!tempRange.start || (tempRange.start && tempRange.end)) {
          setTempRange({ start: dayStr, end: null });
      } else {
          if (dayStr < tempRange.start) {
              setTempRange({ start: dayStr, end: tempRange.start });
          } else {
              setTempRange({ ...tempRange, end: dayStr });
          }
      }
  };

  const applyCustomRange = () => {
      if (tempRange.start && tempRange.end) {
          setDateFilter({ start: tempRange.start, end: tempRange.end, label: 'Пользовательский' });
          setIsDatePickerOpen(false);
      }
  };

  const changeViewMonth = (offset: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(newDate.getMonth() + offset);
      setViewDate(newDate);
  };

  // --- FILTER & PAGINATION PIPELINE ---
  const transactionsInPeriod = transactions.filter(t => 
    t.date >= dateFilter.start && t.date <= dateFilter.end
  );

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0); 
  const periodIncome = transactionsInPeriod.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
  const periodExpense = transactionsInPeriod.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);

  // Global Check for Missing History
  // We check ALL transactions regardless of filter
  const allTimeIncome = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
  const allTimeExpense = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
  
  // Logic: If Income is less than Expense (Negative Net), but Balance is Positive > 0, we have a gap in history.
  // We use a small threshold (e.g. 1000) to ignore rounding errors.
  const isHistoricalDataMissing = (allTimeIncome < allTimeExpense) && (totalBalance > 1000);

  // 1. Filter by Type
  const typeFiltered = transactionsInPeriod.filter(t => filterType === 'All' || t.type === filterType);
  
  // 2. Filter by Search Term
  const searchFiltered = typeFiltered.filter(t => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
          t.description?.toLowerCase().includes(lower) ||
          t.category.toLowerCase().includes(lower) ||
          t.amount.toString().includes(lower)
      );
  });

  // 3. Sorting
  const sortedTransactions = [...searchFiltered].sort((a, b) => {
    if (!sortConfig) return 0; 

    const { key, direction } = sortConfig;
    
    let aValue: any = '';
    let bValue: any = '';

    switch (key) {
        case 'date':
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
            break;
        case 'category':
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
            break;
        case 'account':
            aValue = accounts.find(acc => acc.id === a.accountId)?.name.toLowerCase() || '';
            bValue = accounts.find(acc => acc.id === b.accountId)?.name.toLowerCase() || '';
            break;
        case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
        case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
        default:
            return 0;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // 4. Pagination
  const totalItems = searchFiltered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

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
      resetTxForm();
  };

  const openAccountModal = (account?: FinancialAccount) => {
    if (account) {
        setEditingAccount(account);
        setAccForm({
            name: account.name,
            type: account.type,
            initialBalance: account.balance.toString(),
            accountNumber: account.accountNumber || '',
            parentId: account.parentId || ''
        });
    } else {
        setEditingAccount(null);
        setAccForm({
            name: '',
            type: 'Cash',
            initialBalance: '',
            accountNumber: '',
            parentId: ''
        });
    }
    // Clear pending import if user manually opens modal (unless opened via parser)
    if (!pendingImportTransactions) {
        // Just ensures clean state, though usually safe
    }
    setIsAccountModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const initialFormBalance = parseFloat(accForm.initialBalance) || 0;
      
      if (editingAccount) {
          // Edit existing account logic
          setAccounts(prev => prev.map(acc => {
              if (acc.id === editingAccount.id) {
                  return {
                      ...acc,
                      name: accForm.name,
                      type: accForm.type,
                      balance: initialFormBalance,
                      accountNumber: (accForm.type === 'Bank' || accForm.type === 'SubAccount') ? accForm.accountNumber : undefined,
                      parentId: accForm.type === 'SubAccount' ? accForm.parentId : undefined
                  };
              }
              return acc;
          }));
      } else {
          // CREATE NEW ACCOUNT
          const targetAccountId = `acc${Date.now()}`;
          let finalBalance = initialFormBalance;
          let transactionsToAdd: Transaction[] = [];

          // If we have pending import transactions for this NEW account, process them now
          if (pendingImportTransactions) {
              const { newTransactions } = getTransactionsFromDocs(pendingImportTransactions, targetAccountId, accForm.accountNumber);
              // For new accounts, we assume no duplicates exist yet within this account context
              transactionsToAdd = newTransactions;
              const totalDelta = newTransactions.reduce((acc, tx) => acc + (tx.type === 'Income' ? tx.amount : -tx.amount), 0);
              finalBalance += totalDelta;
          }

          const newAcc: FinancialAccount = {
              id: targetAccountId,
              name: accForm.name,
              type: accForm.type,
              balance: finalBalance,
              accountNumber: (accForm.type === 'Bank' || accForm.type === 'SubAccount') ? accForm.accountNumber : undefined,
              parentId: accForm.type === 'SubAccount' ? accForm.parentId : undefined
          };

          // Update State ATOMICALLY to avoid race conditions with custom hooks
          setAccounts(prev => [...prev, newAcc]);
          
          if (transactionsToAdd.length > 0) {
              setTransactions(prev => [...transactionsToAdd, ...prev]);
          }

          setPendingImportTransactions(null);
      }

      setIsAccountModalOpen(false);
  };

  const resetTxForm = () => {
      setTxForm({ amount: '', category: '', accountId: '', description: '', date: formatDate(new Date()) });
      setTxType('Income');
  };

  const openTxModal = () => {
      setTxForm(prev => ({ ...prev, accountId: accounts[0]?.id || '' }));
      setIsTxModalOpen(true);
  };

  const renderCalendar = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let firstDay = new Date(year, month, 1).getDay();
      firstDay = firstDay === 0 ? 6 : firstDay - 1;

      const days = [];
      for (let i = 0; i < firstDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
      }
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = formatDate(new Date(year, month, d));
          let bgClass = "hover:bg-blue-50 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-700";
          const isSelected = dateStr === tempRange.start || dateStr === tempRange.end;
          const isInRange = tempRange.start && tempRange.end && dateStr > tempRange.start && dateStr < tempRange.end;
          if (isSelected) bgClass = "bg-blue-600 text-white font-bold shadow-md transform scale-105 z-10";
          else if (isInRange) bgClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";

          days.push(
              <button 
                  key={d} 
                  onClick={() => handleDateClick(dateStr)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all ${bgClass}`}
              >
                  {d}
              </button>
          );
      }
      return days;
  };

  // --- SELECTION LOGIC ---
  
  // Check if all items on the current page are selected
  const isAllPageSelected = currentTransactions.length > 0 && currentTransactions.every(t => selectedTxIds.has(t.id));
  
  // Check if absolutely all filtered items are selected
  const isAllTotalSelected = totalItems > 0 && searchFiltered.every(t => selectedTxIds.has(t.id));

  // Toggle ONLY current page
  const toggleSelectPage = () => {
      const newSet = new Set(selectedTxIds);
      if (isAllPageSelected) {
          currentTransactions.forEach(t => newSet.delete(t.id));
      } else {
          currentTransactions.forEach(t => newSet.add(t.id));
      }
      setSelectedTxIds(newSet);
  };

  // Select EVERYTHING matching filter
  const selectAllGlobally = () => {
      const newSet = new Set<string>();
      searchFiltered.forEach(t => newSet.add(t.id));
      setSelectedTxIds(newSet);
  };

  const clearSelection = () => {
      setSelectedTxIds(new Set());
  };

  // --- LAST UPDATE HELPER ---
  const getAccountLastUpdate = (accountId: string) => {
      const accTxs = transactions.filter(t => t.accountId === accountId);
      if (accTxs.length === 0) return null;
      // Sort by date desc (simplified as strings are YYYY-MM-DD)
      accTxs.sort((a, b) => b.date.localeCompare(a.date));
      return accTxs[0].date;
  };

  // Determine if we should show global warning
  const anyBankOutdated = accounts.some(acc => {
      if (acc.type !== 'Bank') return false;
      const last = getAccountLastUpdate(acc.id);
      return last !== todayIso;
  });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight leading-tight">Финансы</h1>
           <p className="text-[17px] text-gray-500 dark:text-gray-400">Управление счетами и потоками</p>
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
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 px-3 sm:px-5 py-2.5 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm font-semibold text-[15px]"
                title="Импорт 1С"
             >
                <Upload size={18} />
                <span className="hidden sm:inline">Импорт 1С</span>
             </button>
             <button 
                onClick={openTxModal}
                className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-3 sm:px-5 py-2.5 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm font-semibold text-[15px]"
                title="Новая транзакция"
             >
                <Plus size={18} />
                <span className="hidden sm:inline">Новая транзакция</span>
             </button>
        </div>
      </div>

      {/* --- CRITICAL GAP WARNING --- */}
      {isHistoricalDataMissing && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
              <FileWarning className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={24} />
              <div>
                  <h4 className="font-bold text-red-900 dark:text-red-200 text-base">Критическое расхождение истории!</h4>
                  <p className="text-sm text-red-800/90 dark:text-red-300/90 mt-1 leading-relaxed">
                      Обнаружена ошибка: <b>Расход превышает Доход</b>, но на счетах положительный баланс.
                      <br/>
                      Это означает, что в системе отсутствует история накоплений за прошлые периоды. 
                      Для точного учета и корректных цифр вам необходимо загрузить выписки 1С <b>за все предыдущие года</b> (с момента открытия счета).
                  </p>
              </div>
          </div>
      )}

      {/* --- GLOBAL WARNING FOR BANK UPDATES (Lesser Priority) --- */}
      {anyBankOutdated && !isHistoricalDataMissing && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" size={20} />
              <div>
                  <h4 className="font-bold text-orange-900 dark:text-orange-200 text-sm">Данные могут быть неточными</h4>
                  <p className="text-sm text-orange-800/80 dark:text-orange-300/80 mt-1">
                      Для автоматической корректировки и точного вывода значений, пожалуйста, загрузите выписку 1С за весь текущий год.
                  </p>
              </div>
          </div>
      )}

      {/* --- SUMMARY CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400"><Wallet size={20} /></div>
                  <span className="font-medium text-[15px]">Общий баланс</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">{totalBalance.toLocaleString()} ₸</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400"><TrendingUp size={20} /></div>
                  <span className="font-medium text-[15px]">Доход <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({dateFilter.label})</span></span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 tracking-tight">+{periodIncome.toLocaleString()} ₸</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"><TrendingDown size={20} /></div>
                  <span className="font-medium text-[15px]">Расход <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({dateFilter.label})</span></span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 tracking-tight">-{periodExpense.toLocaleString()} ₸</div>
          </div>
      </div>

      {/* --- ACCOUNTS SECTION --- */}
      <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <h2 className="text-[20px] font-bold text-black dark:text-white">Счета и Кассы</h2>
              <button onClick={() => openAccountModal()} className="text-ios-blue dark:text-blue-400 text-sm font-semibold hover:opacity-70">
                  + Добавить счет
              </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
              {accounts.map(acc => {
                  // Find parent if sub-account
                  const parentAcc = acc.parentId ? accounts.find(a => a.id === acc.parentId) : null;
                  const lastUpdate = getAccountLastUpdate(acc.id);
                  const isUpToDate = lastUpdate === todayIso;
                  
                  return (
                    <div key={acc.id} className={`min-w-[280px] bg-white dark:bg-slate-800 p-5 rounded-ios shadow-ios border flex flex-col justify-between h-[160px] relative overflow-hidden group transition-all ${!isUpToDate && acc.type === 'Bank' ? 'border-orange-200 dark:border-orange-800/30' : 'border-gray-100 dark:border-slate-700'}`}>
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 transform rotate-12 group-hover:scale-110 transition-transform pointer-events-none text-black dark:text-white">
                            {acc.type === 'Cash' ? <Wallet size={80} /> : acc.type === 'Bank' ? <Landmark size={80} /> : <CreditCard size={80} />}
                        </div>
                        
                        <div className="absolute top-3 right-3 flex gap-1 z-10">
                             {/* Daily Reconciliation Button (Cash Only) */}
                             {acc.type === 'Cash' && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); initiateCashReconcile(acc); }}
                                    className="p-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors mr-1"
                                    title="Сверка кассы за день"
                                >
                                    <CheckSquare size={14} />
                                </button>
                             )}
                             {/* Edit Button */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); openAccountModal(acc); }}
                                className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Редактировать"
                            >
                                <Edit2 size={14} />
                            </button>
                            {/* Delete Button */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); initiateDeleteAccount(acc); }}
                                className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Удалить счет"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                                ${acc.type === 'Cash' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 
                                  acc.type === 'Bank' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 
                                  'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                                    {acc.type === 'Cash' ? <DollarSign size={20} /> : acc.type === 'Bank' ? <Landmark size={20} /> : <CreditCard size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-black dark:text-white text-[15px]">{acc.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                    {acc.type === 'Cash' ? 'Наличные' : acc.type === 'Bank' ? 'Банк' : 'Подсчет'}
                                    {parentAcc && <span className="text-[10px] bg-gray-100 dark:bg-slate-700 px-1 rounded flex items-center"><CornerDownRight size={8} className="mr-0.5"/> {parentAcc.name}</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-white">{acc.balance.toLocaleString()} ₸</div>
                            {acc.accountNumber && (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-1 flex items-center gap-1">
                                    <Hash size={10} /> {acc.accountNumber}
                                </div>
                            )}
                        </div>

                        {/* Status / Update Action */}
                        <div className="pt-2 mt-auto border-t border-dashed border-gray-100 dark:border-slate-700">
                            {acc.type === 'Bank' ? (
                                !isUpToDate ? (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors w-full justify-center animate-pulse"
                                    >
                                        <FileUp size={12} />
                                        Требуется выписка (весь год)
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded w-fit">
                                        <CheckCircle size={10} />
                                        Актуально (сегодня)
                                    </div>
                                )
                            ) : (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                                    {acc.type === 'Cash' ? 'Сверка через кассу' : 'Синхронизируется автоматически'}
                                </div>
                            )}
                        </div>
                    </div>
                  );
              })}
              
              {/* Add Button Card */}
              <button onClick={() => openAccountModal()} className="min-w-[100px] flex flex-col items-center justify-center gap-2 rounded-ios border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:border-ios-blue hover:text-ios-blue dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors h-[160px]">
                  <Plus size={24} />
                  <span className="text-sm font-medium">Новый</span>
              </button>
          </div>
      </div>

      {/* --- TRANSACTIONS LIST --- */}
      <div className="bg-white dark:bg-slate-800 rounded-ios shadow-ios border border-gray-200 dark:border-slate-700 overflow-visible relative">
          
          {/* Controls Bar */}
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              
              {/* Left Side: Title & Date */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                 <h2 className="text-[17px] font-bold text-black dark:text-white whitespace-nowrap">История операций</h2>
                 
                 {/* Date Filter Dropdown */}
                 <div className="relative" ref={datePickerRef}>
                    <button 
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border border-transparent hover:border-gray-200 dark:hover:border-slate-500 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all"
                    >
                        <CalendarIcon size={16} className="text-gray-500 dark:text-gray-400"/>
                        <span>{dateFilter.label}</span>
                        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDatePickerOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 flex flex-col sm:flex-row w-[320px] sm:w-[540px] overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {/* Sidebar Presets */}
                            <div className="w-full sm:w-1/3 bg-gray-50/80 dark:bg-slate-900/50 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-slate-700 p-2 flex flex-col gap-1">
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Быстрый выбор</div>
                                {[
                                    { id: 'month', label: 'За текущий месяц' },
                                    { id: 'last_month', label: 'За прошлый месяц' },
                                    { id: 'year', label: 'За текущий год' },
                                    { id: 'all', label: 'За всё время' }
                                ].map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handlePreset(preset.id as any)}
                                        className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dateFilter.label === preset.label ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Visual Calendar */}
                            <div className="w-full sm:w-2/3 p-4">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <button onClick={() => changeViewMonth(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400"><ChevronLeft size={20} /></button>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}</span>
                                    <button onClick={() => changeViewMonth(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400"><ChevronRight size={20} /></button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                                        <div key={d} className="text-xs text-gray-400 font-medium">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1 place-items-center">
                                    {renderCalendar()}
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {tempRange.start ? `${tempRange.start} — ` : 'Выберите даты'}
                                        {tempRange.end ? tempRange.end : ''}
                                    </div>
                                    <button 
                                        onClick={applyCustomRange}
                                        disabled={!tempRange.start || !tempRange.end}
                                        className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Применить
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
              </div>
              
              {/* Right Side: Search, Filters, Selection Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto justify-end">
                 
                 {/* Delete Selected Action */}
                 {selectedTxIds.size > 0 && (
                     <div className="flex items-center gap-2 animate-in fade-in">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{selectedTxIds.size} выбрано</span>
                        <button 
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Удалить</span>
                        </button>
                     </div>
                 )}

                 {/* Search Input */}
                 <div className="relative w-full sm:w-auto">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                     <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Поиск..." 
                        className="w-full sm:w-48 pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white"
                     />
                 </div>

                 {/* Type Switcher */}
                 <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-full sm:w-auto">
                    {(['All', 'Income', 'Expense'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[13px] font-medium rounded-md transition-all ${filterType === type ? 'bg-white dark:bg-slate-600 shadow-sm text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            {type === 'All' ? 'Все' : type === 'Income' ? 'Доходы' : 'Расходы'}
                        </button>
                    ))}
                 </div>
              </div>
          </div>
          
          {/* SELECTION BANNER */}
          {isAllPageSelected && !isAllTotalSelected && (
              <div className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-900/50 p-2 text-center text-sm text-blue-800 dark:text-blue-300 animate-in fade-in slide-in-from-top-1">
                  <span>Выбрано <b>{currentTransactions.length}</b> на этой странице.</span>
                  <button 
                    onClick={selectAllGlobally}
                    className="ml-2 font-bold underline hover:text-blue-900 cursor-pointer"
                  >
                      Выбрать все транзакции ({totalItems})
                  </button>
              </div>
          )}
          {isAllTotalSelected && totalItems > currentTransactions.length && (
              <div className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-900/50 p-2 text-center text-sm text-blue-800 dark:text-blue-300 animate-in fade-in slide-in-from-top-1">
                  <span>Выбраны все <b>{totalItems}</b> транзакций.</span>
                  <button 
                    onClick={clearSelection}
                    className="ml-2 font-bold underline hover:text-blue-900 cursor-pointer"
                  >
                      Снять выделение
                  </button>
              </div>
          )}

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 font-medium">
                      <tr>
                          <th className="px-4 py-3 w-[40px] text-center">
                              {/* Master Checkbox: Selects ONLY CURRENT PAGE */}
                              <input 
                                type="checkbox" 
                                className="rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 cursor-pointer dark:bg-slate-700"
                                checked={isAllPageSelected}
                                onChange={toggleSelectPage}
                              />
                          </th>
                          
                          <th onClick={() => handleSort('date')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center gap-1">
                                  Дата
                                  {sortConfig?.key === 'date' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          
                          <th onClick={() => handleSort('category')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center gap-1">
                                  Категория / Описание
                                  {sortConfig?.key === 'category' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          
                          <th onClick={() => handleSort('account')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center gap-1">
                                  Счет
                                  {sortConfig?.key === 'account' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          
                          <th onClick={() => handleSort('amount')} className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center justify-end gap-1">
                                  Сумма
                                  {sortConfig?.key === 'amount' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          
                          <th onClick={() => handleSort('type')} className="px-6 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center justify-center gap-1">
                                  Тип
                                  {sortConfig?.key === 'type' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {currentTransactions.length > 0 ? (
                          currentTransactions.map(tx => {
                            const account = accounts.find(a => a.id === tx.accountId);
                            const isSelected = selectedTxIds.has(tx.id);
                            return (
                                <tr key={tx.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 cursor-pointer dark:bg-slate-700"
                                            checked={isSelected}
                                            onChange={() => toggleSelectOne(tx.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">{tx.date}</td>
                                    <td className="px-6 py-4 max-w-[250px]">
                                        <div className="font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-2 truncate" title={tx.category}>
                                            {tx.category}
                                            {tx.is1C && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800 font-bold shrink-0">1С</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={tx.description}>{tx.description}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={account ? account.name : 'Неизвестно'}>
                                        {account ? account.name : 'Неизвестно'}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold text-[15px] ${tx.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {tx.type === 'Income' ? '+' : '-'}{tx.amount.toLocaleString()} ₸
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${tx.type === 'Income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {tx.type === 'Income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                      ) : (
                          <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                  Нет операций за выбранный период
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* --- PAGINATION CONTROLS --- */}
          {totalItems > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-700/30">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Показано {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} из {totalItems}
                  </div>
                  
                  <div className="flex items-center gap-4">
                      {/* Items Per Page Select */}
                      <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Строк:</span>
                          <select 
                              value={itemsPerPage}
                              onChange={(e) => setItemsPerPage(Number(e.target.value))}
                              className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
                          >
                              {[10, 20, 30, 40, 50, 100, 1000].map(val => (
                                  <option key={val} value={val}>{val}</option>
                              ))}
                          </select>
                      </div>

                      {/* Page Navigation */}
                      <div className="flex items-center gap-1">
                          <button 
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                              <ChevronLeft size={18} />
                          </button>
                          
                          <div className="flex items-center gap-1">
                              {(() => {
                                  let startPage = Math.max(1, currentPage - 2);
                                  let endPage = Math.min(totalPages, startPage + 4);
                                  
                                  if (endPage - startPage < 4) {
                                      startPage = Math.max(1, endPage - 4);
                                  }
                                  
                                  const pages = [];
                                  for (let i = startPage; i <= endPage; i++) {
                                      pages.push(i);
                                  }
                                  
                                  return pages.map(p => (
                                      <button
                                          key={p}
                                          onClick={() => handlePageChange(p)}
                                          className={`w-7 h-7 rounded-md text-xs font-bold transition-colors ${currentPage === p ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                                      >
                                          {p}
                                      </button>
                                  ));
                              })()}
                          </div>

                          <button 
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                              <ChevronRight size={18} />
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* --- MODAL: NEW TRANSACTION --- */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className={`p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white`}>
                  Новая транзакция
              </h2>
              <button onClick={() => setIsTxModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
              {/* ... existing form content ... */}
              {/* Type Switcher */}
              <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('Income')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    txType === 'Income' 
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-green-700 dark:text-green-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <ArrowDownLeft size={16} />
                  Доход
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('Expense')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    txType === 'Expense' 
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-red-700 dark:text-red-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  Расход
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сумма (₸)</label>
                <input 
                  required
                  autoFocus
                  type="number" 
                  value={txForm.amount}
                  onChange={e => setTxForm({...txForm, amount: e.target.value})}
                  className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-lg focus:outline-none focus:ring-2 text-2xl font-bold text-gray-900 dark:text-white transition-colors ${
                      txType === 'Income' 
                        ? 'border-gray-300 dark:border-slate-600 focus:ring-green-500' 
                        : 'border-gray-300 dark:border-slate-600 focus:ring-red-500'
                  }`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Счет / Касса</label>
                <select 
                  required
                  value={txForm.accountId}
                  onChange={e => setTxForm({...txForm, accountId: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toLocaleString()} ₸)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
                <input 
                  required
                  type="text" 
                  value={txForm.category}
                  onChange={e => setTxForm({...txForm, category: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={txType === 'Income' ? "Оплата от клиента, Возврат..." : "Аренда, Зарплата, Закуп..."}
                  list="categories"
                />
                <datalist id="categories">
                    <option value="Оплата от клиента" />
                    <option value="Зарплата" />
                    <option value="Аренда" />
                    <option value="Закуп оборудования" />
                    <option value="ГСМ" />
                    <option value="Налоги" />
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание / Комментарий</label>
                <textarea 
                  rows={2}
                  value={txForm.description}
                  onChange={e => setTxForm({...txForm, description: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Детали операции..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                <input 
                  required
                  type="date" 
                  value={txForm.date}
                  onChange={e => setTxForm({...txForm, date: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 px-4 py-2 text-white rounded-lg shadow-md font-medium transition-colors flex items-center justify-center gap-2 ${txType === 'Income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  <Save size={18} />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: UNKNOWN ACCOUNT WARNING --- */}
      {isUnknownAccountModalOpen && pendingNewAccountDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-6 bg-red-50 dark:bg-red-900/30 border-b border-red-100 dark:border-red-900/50 flex gap-4 items-start">
                      <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 dark:text-red-400 shrink-0">
                          <AlertTriangle size={24} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-red-900 dark:text-red-300">Счет не найден</h3>
                          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                              В файле выписки указан счет, которого еще нет в вашей системе.
                          </p>
                      </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* ... existing modal content ... */}
                      <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl border border-gray-200 dark:border-slate-600 text-sm">
                          <div className="mb-2 flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400 font-medium">Номер счета:</span> 
                              <span className="font-mono font-bold text-gray-900 dark:text-white">{pendingNewAccountDetails.number}</span>
                          </div>
                          <div className="mb-2 flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400 font-medium">Банк:</span> 
                              <span className="font-bold text-gray-900 dark:text-white text-right max-w-[200px] truncate">{pendingNewAccountDetails.bankName}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400 font-medium">Остаток в файле:</span> 
                              <span className="font-bold text-gray-900 dark:text-white">{pendingNewAccountDetails.balance.toLocaleString()} ₸</span>
                          </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                          Чтобы продолжить импорт транзакций, необходимо сначала добавить этот счет в систему.
                      </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                      <button 
                          onClick={() => { setIsUnknownAccountModalOpen(false); setPendingImportTransactions(null); }}
                          className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors font-medium"
                      >
                          Отмена
                      </button>
                      <button 
                          onClick={proceedToCreateAccount}
                          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md font-bold transition-colors"
                      >
                          Создать этот счет
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: DELETE TRANSACTIONS CONFIRMATION --- */}
      {isDeleteTxModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Удалить транзакции?</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Вы выбрали <span className="font-bold text-gray-800 dark:text-gray-200">{selectedTxIds.size}</span> операций.
                          <br/>
                          Это действие отменит влияние этих операций на баланс счетов.
                      </p>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 font-medium text-left flex items-start gap-2">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          <div>
                              Действие необратимо. Удаленные транзакции нельзя будет восстановить.
                          </div>
                      </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                      <button 
                          onClick={() => setIsDeleteTxModalOpen(false)}
                          className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors font-medium"
                      >
                          Отмена
                      </button>
                      <button 
                          onClick={executeDeleteSelected}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-md font-bold transition-colors"
                      >
                          Да, удалить
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: CASH RECONCILE --- */}
      {cashReconcileAccount && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-green-900 dark:text-green-300 flex items-center gap-2">
                          <Scale size={20} />
                          Сверка кассы
                      </h3>
                      <button onClick={() => setCashReconcileAccount(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleCashReconcileSubmit} className="p-6 space-y-4">
                      <div className="text-center mb-4">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Расчетный остаток по системе</div>
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">{cashReconcileAccount.balance.toLocaleString()} ₸</div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Фактический остаток (в наличии)</label>
                          <input 
                              autoFocus
                              type="number" 
                              required
                              value={cashActualBalance}
                              onChange={(e) => setCashActualBalance(e.target.value)}
                              placeholder="Введите сумму"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-lg text-gray-900 dark:text-white"
                          />
                      </div>

                      {cashActualBalance && (
                          <div className={`p-3 rounded-lg border text-sm font-medium flex justify-between items-center ${
                              parseFloat(cashActualBalance) === cashReconcileAccount.balance 
                              ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                              : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
                          }`}>
                              <span>Разница:</span>
                              <span className="font-bold">
                                  {(parseFloat(cashActualBalance) - cashReconcileAccount.balance) > 0 ? '+' : ''}
                                  {(parseFloat(cashActualBalance) - cashReconcileAccount.balance).toLocaleString()} ₸
                              </span>
                          </div>
                      )}

                      <button 
                          type="submit"
                          disabled={!cashActualBalance}
                          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                          Подтвердить остаток
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- MODAL: DELETE ACCOUNT CONFIRMATION --- */}
      {deletingAccount && deleteStep > 0 && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  
                  {/* Step 1: Warning */}
                  {deleteStep === 1 && (
                      <>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Удалить счет?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                Вы собираетесь удалить счет <span className="font-bold text-gray-800 dark:text-gray-200">"{deletingAccount.name}"</span>.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Это действие требует подтверждения.
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                            <button 
                                onClick={() => { setDeletingAccount(null); setDeleteStep(0); }}
                                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button 
                                onClick={() => setDeleteStep(2)}
                                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 shadow-md font-bold transition-colors"
                            >
                                Продолжить
                            </button>
                        </div>
                      </>
                  )}

                  {/* Step 2: Critical Danger */}
                  {deleteStep === 2 && (
                      <>
                        <div className="p-6 text-center bg-red-50 dark:bg-red-900/30">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border-4 border-red-100 dark:border-red-900/50">
                                <AlertOctagon size={32} />
                            </div>
                            <h3 className="text-xl font-extrabold text-red-900 dark:text-red-300 mb-2">ВНИМАНИЕ!</h3>
                            <p className="text-sm text-red-800 dark:text-red-300 mb-4 font-medium leading-relaxed">
                                Если вы удалите этот счет, 
                                <br/>
                                <span className="text-base font-black underline decoration-red-400 decoration-2">ВСЕ {transactions.filter(t => t.accountId === deletingAccount.id).length} ТРАНЗАКЦИЙ</span>
                                <br/>
                                связанные с ним, будут удалены безвозвратно!
                            </p>
                            <div className="text-xs text-red-600/80 dark:text-red-300/80 bg-red-100/50 dark:bg-red-900/50 p-2 rounded-lg border border-red-200 dark:border-red-900/50">
                                Это действие нельзя отменить. Баланс будет пересчитан.
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-red-100 dark:border-red-900/30 flex gap-3">
                            <button 
                                onClick={() => { setDeletingAccount(null); setDeleteStep(0); }}
                                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button 
                                onClick={() => setDeleteStep(3)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 font-bold transition-colors"
                            >
                                Я понимаю, продолжить
                            </button>
                        </div>
                      </>
                  )}

                  {/* Step 3: Manual Confirmation */}
                  {deleteStep === 3 && (
                      <>
                        <div className="p-6 bg-white dark:bg-slate-800">
                            <div className="flex flex-col items-center text-center mb-4">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center mb-3">
                                    <ShieldAlert size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Финальная проверка</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Чтобы подтвердить удаление, введите название счета <br/>
                                    <span className="font-mono font-bold text-black dark:text-white bg-gray-100 dark:bg-slate-700 px-1 rounded select-all">{deletingAccount.name}</span>
                                </p>
                            </div>
                            
                            <input 
                                autoFocus
                                type="text" 
                                value={deleteConfirmationName}
                                onChange={(e) => setDeleteConfirmationName(e.target.value)}
                                placeholder="Введите название счета"
                                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30 transition-all font-medium text-center"
                            />
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                            <button 
                                onClick={() => { setDeletingAccount(null); setDeleteStep(0); setDeleteConfirmationName(''); }}
                                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button 
                                onClick={executeDeleteAccount}
                                disabled={deleteConfirmationName !== deletingAccount.name}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-md font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Удалить навсегда
                            </button>
                        </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* --- MODAL: IMPORT RESULT --- */}
      {importResult.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
             {/* Header */}
             <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-center flex-col text-center">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${importResult.added > 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                     <CheckCircle size={28} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">Импорт завершен</h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Счет: <span className="font-semibold">{importResult.accountName}</span></p>
             </div>
             
             {/* Body */}
             <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-600 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Добавлено</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">+{importResult.added}</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-600 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Дубликаты</div>
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{importResult.duplicates}</div>
                    </div>
                 </div>

                 {/* Balance Check Logic */}
                 <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 space-y-3">
                     <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                         <Scale size={16} /> Сверка баланса по выписке
                     </h4>
                     
                     <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-600 dark:text-gray-400">Конечный остаток (Файл):</span>
                         <span className="font-bold text-gray-900 dark:text-white">
                             {importResult.fileFinalBalance !== undefined ? importResult.fileFinalBalance.toLocaleString() : 'Н/Д'} ₸
                         </span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-600 dark:text-gray-400">Расчетный остаток (CRM):</span>
                         <span className="font-bold text-gray-900 dark:text-white">{importResult.projectedBalance.toLocaleString()} ₸</span>
                     </div>

                     {importResult.fileFinalBalance !== undefined && importResult.fileFinalBalance !== importResult.projectedBalance && (
                         <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-lg border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-200 mt-2">
                             <div className="font-bold flex items-center gap-1 mb-1">
                                 <AlertTriangle size={12} /> Расхождение: {(importResult.fileFinalBalance - importResult.projectedBalance).toLocaleString()} ₸
                             </div>
                             Необходимо выровнять баланс, чтобы он соответствовал выписке банка за прошедший период.
                         </div>
                     )}
                 </div>
                 
                 {importResult.added === 0 && importResult.duplicates === 0 && (
                     <p className="text-center text-gray-500 dark:text-gray-400 text-sm">Нет данных для импорта.</p>
                 )}
             </div>
             
             {/* Footer */}
             <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
                 {(importResult.fileFinalBalance !== undefined && importResult.fileFinalBalance !== importResult.projectedBalance) ? (
                     <button 
                        onClick={applyImportCorrection}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors"
                     >
                        Скорректировать баланс
                     </button>
                 ) : (
                    <button 
                        onClick={() => setImportResult({...importResult, open: false})}
                        className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                    >
                        Отлично, закрыть
                    </button>
                 )}
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL: NEW / EDIT ACCOUNT --- */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <Landmark size={24} />
                  {editingAccount ? 'Редактировать счет' : 'Новый счет'}
              </h2>
              <button 
                onClick={() => { setIsAccountModalOpen(false); setPendingImportTransactions(null); }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название счета</label>
                <input 
                  required
                  type="text" 
                  value={accForm.name}
                  onChange={e => setAccForm({...accForm, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  placeholder="Касса №2, Halyk Gold..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип счета</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: 'Касса' }, 
                      { id: 'Bank', label: 'Банк' }, 
                      { id: 'SubAccount', label: 'Подсчет' }
                    ].map(type => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => setAccForm({...accForm, type: type.id as AccountType, accountNumber: '', parentId: ''})}
                            className={`py-2 px-1 rounded-lg border text-sm font-medium transition-colors ${accForm.type === type.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
              </div>

              {(accForm.type === 'Bank' || accForm.type === 'SubAccount') && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {accForm.type === 'SubAccount' ? 'Номер карты / счета' : 'Номер счета (ИИК)'}
                    </label>
                    <input 
                      type="text" 
                      value={accForm.accountNumber}
                      onChange={e => setAccForm({...accForm, accountNumber: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 dark:text-white"
                      placeholder={accForm.type === 'SubAccount' ? "0000 0000 0000 0000" : "KZ..."}
                    />
                  </div>
              )}

              {accForm.type === 'SubAccount' && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Родительский счет</label>
                    <select
                      required
                      value={accForm.parentId}
                      onChange={e => setAccForm({...accForm, parentId: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Выберите главный счет</option>
                        {accounts.filter(a => a.type !== 'SubAccount' && a.id !== editingAccount?.id).map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.type === 'Cash' ? 'Касса' : 'Банк'})</option>
                        ))}
                    </select>
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {editingAccount ? 'Текущий баланс' : 'Начальный остаток'}
                </label>
                <input 
                  required
                  type="number" 
                  value={accForm.initialBalance}
                  onChange={e => setAccForm({...accForm, initialBalance: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  placeholder="0"
                />
              </div>

              {/* Import specific warning inside the create modal too, just in case context is needed */}
              {pendingImportTransactions && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm border border-blue-200 dark:border-blue-900/40 flex gap-2">
                      <FileText size={16} className="shrink-0 mt-0.5" />
                      <div>
                          <strong>Авто-импорт:</strong> При создании будет загружено {pendingImportTransactions.length} операций.
                      </div>
                  </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setIsAccountModalOpen(false); setPendingImportTransactions(null); }}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingAccount ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
