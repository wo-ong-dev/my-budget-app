import { lazy, Suspense, useCallback, useState } from "react";
import LoginScreen from "./components/auth/LoginScreen";
import Header from "./components/layout/Header";
import TabNavigation from "./components/layout/TabNavigation";
import type { TabDefinition } from "./components/layout/TabNavigation";
import TransactionForm from "./components/transactions/TransactionForm";
import TransactionFilters from "./components/transactions/TransactionFilters";
import TransactionList from "./components/transactions/TransactionList";
import EditTransactionModal from "./components/transactions/EditTransactionModal";
const SummaryPanel = lazy(() => import("./components/summary/SummaryPanel"));
import BudgetPanel from "./components/budget/BudgetPanel";
import ExportCSVModal from "./components/export/ExportCSVModal";
import MonthlyReportModal from "./components/report/MonthlyReportModal";
import type { TransactionFilterState } from "./types";
import { useTabNavigation } from "./hooks/useTabNavigation";
import { useTransactions } from "./hooks/useTransactions";
import { useMasterData } from "./hooks/useMasterData";
import { useBudgets } from "./hooks/useBudgets";
import { useCsvImport } from "./hooks/useCsvImport";
import { useExport } from "./hooks/useExport";

const tabs: TabDefinition[] = [
  { key: "input", label: "내역 입력", description: "새로운 내역을 기록" },
  { key: "history", label: "내역 조회", description: "월별 목록과 필터" },
  { key: "summary", label: "통계 요약", description: "수입·지출 현황" },
  { key: "budget", label: "예산 관리", description: "월별 예산 현황" },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [quickInputMode, setQuickInputMode] = useState(false);

  const { activeTab, setActiveTab, slideDirection, swipeHandlers, handleTabChange } = useTabNavigation();

  const {
    availableMonths, filters, setFilters,
    transactions, summary, monthlyComparison,
    isLoading, error, setError, setLoading,
    editingTransaction, isEditModalOpen, setEditModalOpen, setEditingTransaction,
    isSubmitting, isDeleting,
    filteredTransactions, filteredSummary,
    refetch,
    handleCreate, handleEditRequest, handleUpdate, handleDelete,
  } = useTransactions(activeTab);

  const { accounts, categories, apiCategories, loadMasterData } = useMasterData(transactions);

  const {
    budgets, isBudgetLoading,
    handleUpdateBudget, handleDeleteBudget, handleAddBudget, handleReorderBudgets,
  } = useBudgets(activeTab, filters.month, setError);

  const {
    isDragging,
    handleImportCSV, handleCompareCSV,
    handleDragEnter, handleDragLeave, handleDragOver, handleDrop,
  } = useCsvImport(filters.month, refetch, setError, setLoading, setActiveTab);

  const {
    isExportModalOpen, setExportModalOpen,
    isReportModalOpen, setReportModalOpen,
    handleOpenExportModal, handleExportCSV,
  } = useExport(setError);

  const handleAccountClick = (account: string) => {
    setActiveTab("history");
    setFilters((prev) => ({ ...prev, account, category: "ALL" }));
  };

  const handleCategoryClick = (category: string) => {
    setActiveTab("history");
    setFilters((prev) => ({ ...prev, category, account: "ALL" }));
  };

  const handleFiltersChange = (next: TransactionFilterState) => {
    setFilters(next);
  };

  return (
    <div
      className={`app-shell ${isDragging ? 'app-shell--dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="app-container" {...swipeHandlers}>
        <Header
          onClickTitle={() => setActiveTab("input")}
          onExportCSV={handleOpenExportModal}
          onImportCSV={handleImportCSV}
          onCompareCSV={handleCompareCSV}
          onMonthlyReport={() => setReportModalOpen(true)}
        />
        <TabNavigation tabs={tabs} activeTab={activeTab} onSelect={handleTabChange} />

        <section className={`tab-panel tab-panel--input ${activeTab === "input" ? "tab-panel--active" : ""} ${activeTab === "input" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
          {activeTab === "input" ? (
            <>
              {error && <div className="alert alert--error">{error}</div>}
              <TransactionForm
                accounts={accounts}
                categories={apiCategories}
                onSubmit={(draft) => handleCreate(draft, quickInputMode, setActiveTab)}
                submitting={isSubmitting && !isEditModalOpen}
                submitLabel="내역 저장"
                quickInputMode={quickInputMode}
                onQuickInputModeChange={setQuickInputMode}
              />
            </>
          ) : null}
        </section>

        <section className={`tab-panel tab-panel--history ${activeTab === "history" ? "tab-panel--active" : ""} ${activeTab === "history" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
          {activeTab === "history" ? (
            <div className="history-container">
              {error && <div className="alert alert--error">{error}</div>}
              <TransactionFilters
                filters={filters}
                onChange={handleFiltersChange}
                months={availableMonths}
                accounts={accounts}
                categories={categories}
              />
              <TransactionList
                transactions={filteredTransactions}
                isLoading={isLoading}
                onEdit={handleEditRequest}
                onDelete={handleDelete}
                totalIncome={filteredSummary.totalIncome}
                totalExpense={filteredSummary.totalExpense}
                balance={filteredSummary.balance}
              />
            </div>
          ) : null}
        </section>

        <section className={`tab-panel tab-panel--summary ${activeTab === "summary" ? "tab-panel--active" : ""} ${activeTab === "summary" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
          {activeTab === "summary" ? (
            <Suspense fallback={<div className="skeleton-block" style={{ height: 300 }} />}>
              <SummaryPanel
                summary={summary}
                loading={isLoading}
                currentMonth={filters.month}
                availableMonths={availableMonths}
                onMonthChange={(month) => setFilters((prev) => ({ ...prev, month }))}
                monthlyComparison={monthlyComparison}
                onCategoryClick={handleCategoryClick}
                onAccountClick={handleAccountClick}
              />
            </Suspense>
          ) : null}
        </section>

        <section className={`tab-panel tab-panel--budget ${activeTab === "budget" ? "tab-panel--active" : ""} ${activeTab === "budget" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
          {activeTab === "budget" ? (
            <BudgetPanel
              budgets={budgets}
              loading={isBudgetLoading}
              currentMonth={filters.month}
              availableMonths={availableMonths}
              accounts={accounts}
              onMonthChange={(month) => setFilters((prev) => ({ ...prev, month }))}
              onUpdateBudget={handleUpdateBudget}
              onDeleteBudget={handleDeleteBudget}
              onAddBudget={handleAddBudget}
              onCategoryUpdate={loadMasterData}
              onAccountClick={handleAccountClick}
              onReorderBudgets={handleReorderBudgets}
            />
          ) : null}
        </section>
      </div>

      <EditTransactionModal
        open={isEditModalOpen}
        transaction={editingTransaction}
        accounts={accounts}
        categories={apiCategories}
        onSubmit={handleUpdate}
        onDelete={() => {
          if (editingTransaction) {
            void handleDelete(editingTransaction);
          }
        }}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTransaction(null);
        }}
        submitting={isSubmitting}
        deleting={isDeleting}
      />

      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportCSV}
        availableMonths={availableMonths}
        currentMonth={filters.month}
      />

      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setReportModalOpen(false)}
        summary={summary}
        month={filters.month}
      />
    </div>
  );
}

export default App;
