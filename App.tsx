import React, { useState, useEffect } from 'react';
import { Transaction, Budget, FinancialGoal, WhatIfScenario, Category } from './types/finance';
import { 
  loadStoredTransactions, saveTransactions, 
  loadStoredBudgets, saveBudgets, 
  loadStoredGoals, saveGoals, 
  loadStoredScenario, saveScenario, 
  resetAllToDemo 
} from './utils/storage';
import { generateAIInsights, getCategoryForecasts, detectAnomalies } from './utils/mlEngine';
import { Header } from './components/Header';
import { OverviewCards } from './components/OverviewCards';
import { AiInsightsPanel } from './components/AiInsightsPanel';
import { PredictionDashboard } from './components/PredictionDashboard';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { TransactionManager } from './components/TransactionManager';
import { BudgetPlanner } from './components/BudgetPlanner';
import { GoalTracker } from './components/GoalTracker';
import { WhatIfSimulator } from './components/WhatIfSimulator';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [scenario, setScenario] = useState<WhatIfScenario>({
    incomeChangePercent: 0,
    rentAdjustmentAmount: 0,
    diningCutbackPercent: 0,
    shoppingCutbackPercent: 0,
    inflationRatePercent: 3.2
  });

  // Load state on mount
  useEffect(() => {
    setTransactions(loadStoredTransactions());
    setBudgets(loadStoredBudgets());
    setGoals(loadStoredGoals());
    setScenario(loadStoredScenario());
  }, []);

  const { anomalyCount } = detectAnomalies(transactions);
  const categoryForecasts = getCategoryForecasts(transactions);
  const aiInsights = generateAIInsights(transactions, categoryForecasts);

  // Handlers
  const handleAddTransaction = (newTx: Transaction) => {
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleImportCSV = (imported: Transaction[]) => {
    const updated = [...imported, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleUpdateBudget = (category: Category, newLimit: number) => {
    const updated = budgets.map(b => b.category === category ? { ...b, monthlyLimit: newLimit } : b);
    setBudgets(updated);
    saveBudgets(updated);
  };

  const handleAutoRecommendBudgets = () => {
    const updated = budgets.map(b => {
      const fc = categoryForecasts.find(f => f.category === b.category);
      if (fc) {
        return {
          ...b,
          monthlyLimit: Math.round(fc.predictedNextMonth * 1.05) // 5% buffer over ML prediction
        };
      }
      return b;
    });
    setBudgets(updated);
    saveBudgets(updated);
    alert('Category budgets auto-adjusted based on Holt-Winters ML expense predictions!');
  };

  const handleAddGoal = (newGoal: FinancialGoal) => {
    const updated = [...goals, newGoal];
    setGoals(updated);
    saveGoals(updated);
  };

  const handleUpdateGoalProgress = (id: string, newAmount: number) => {
    const updated = goals.map(g => g.id === id ? { ...g, currentAmount: newAmount } : g);
    setGoals(updated);
    saveGoals(updated);
  };

  const handleUpdateScenario = (newScenario: WhatIfScenario) => {
    setScenario(newScenario);
    saveScenario(newScenario);
  };

  const handleResetDemo = () => {
    if (confirm('Reset dataset to initial realistic demo values?')) {
      const demo = resetAllToDemo();
      setTransactions(demo.transactions);
      setBudgets(demo.budgets);
      setGoals(demo.goals);
      setScenario(demo.scenario);
    }
  };

  const handleInsightAction = (insight: any) => {
    if (insight.type === 'anomaly') {
      setActiveTab('transactions');
    } else if (insight.type === 'warning') {
      setActiveTab('forecast');
    } else {
      setActiveTab('budgets');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setActiveTab('transactions')}
        onResetDemo={handleResetDemo}
        anomalyCount={anomalyCount}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Cards across overview and forecast tabs */}
        {(activeTab === 'overview' || activeTab === 'forecast') && (
          <OverviewCards
            transactions={transactions}
            budgets={budgets}
            anomalyCount={anomalyCount}
            onNavigateToForecast={() => setActiveTab('forecast')}
            onNavigateToAnomalies={() => setActiveTab('transactions')}
          />
        )}

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AiInsightsPanel 
              insights={aiInsights} 
              onActionClick={handleInsightAction} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsCharts transactions={transactions} />
              <PredictionDashboard transactions={transactions} />
            </div>
          </div>
        )}

        {/* Tab 2: ML Expense Prediction */}
        {activeTab === 'forecast' && (
          <PredictionDashboard transactions={transactions} />
        )}

        {/* Tab 3: Analytics & Trends */}
        {activeTab === 'analytics' && (
          <AnalyticsCharts transactions={transactions} />
        )}

        {/* Tab 4: Transactions & CSV Manager */}
        {activeTab === 'transactions' && (
          <TransactionManager
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportCSV={handleImportCSV}
          />
        )}

        {/* Tab 5: Budgets & Goals */}
        {activeTab === 'budgets' && (
          <div className="space-y-8">
            <BudgetPlanner
              budgets={budgets}
              transactions={transactions}
              onUpdateBudget={handleUpdateBudget}
              onAutoRecommendBudgets={handleAutoRecommendBudgets}
            />

            <GoalTracker
              goals={goals}
              transactions={transactions}
              onAddGoal={handleAddGoal}
              onUpdateGoalProgress={handleUpdateGoalProgress}
            />
          </div>
        )}

        {/* Tab 6: What-If Scenario Simulator */}
        {activeTab === 'simulator' && (
          <WhatIfSimulator
            scenario={scenario}
            onChangeScenario={handleUpdateScenario}
            transactions={transactions}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>Intelligent Personal Finance Management & Expense Prediction System • Machine Learning Forecast Engine</p>
          <p className="mt-1 text-[11px] text-slate-600">
            Path: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400">C:\Users\abhay\.gemini\antigravity\scratch\personal-finance-system</code>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
