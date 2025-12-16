
import React from 'react';
import { User } from '../types';
import { FinanceManager } from '../components/FinanceManager';

interface FinancePageProps {
  user: User;
}

export const FinancePage: React.FC<FinancePageProps> = ({ user }) => {
  return <FinanceManager user={user} />;
};
