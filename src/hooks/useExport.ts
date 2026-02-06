import { useState } from "react";
import * as XLSX from "xlsx";
import { fetchTransactionsByDateRange } from "../services/transactionService";
import type { ExportFormat } from "../components/export/ExportCSVModal";

export function useExport(setError: (error: string | null) => void) {
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);

  const handleOpenExportModal = () => setExportModalOpen(true);

  const handleExportCSV = async (startMonth: string, endMonth: string, format: ExportFormat) => {
    try {
      const startDate = `${startMonth}-01`;
      const [endYear, endM] = endMonth.split("-").map(Number);
      const lastDay = new Date(endYear, endM, 0).getDate();
      const endDate = `${endMonth}-${String(lastDay).padStart(2, "0")}`;

      const data = await fetchTransactionsByDateRange(startDate, endDate);

      if (data.length === 0) {
        setError("선택한 기간에 내역이 없습니다.");
        return;
      }

      const fileBaseName = startMonth === endMonth
        ? `가계부_${startMonth}`
        : `가계부_${startMonth}_${endMonth}`;

      if (format === "excel") {
        const workbook = XLSX.utils.book_new();
        const categoryMap = new Map<string, typeof data>();
        data.forEach(tx => {
          const category = tx.category || "기타";
          if (!categoryMap.has(category)) categoryMap.set(category, []);
          categoryMap.get(category)!.push(tx);
        });

        const allHeaders = ["날짜", "구분", "금액", "메모", "통장분류", "소비항목"];
        const allRows = data.map(tx => ({
          날짜: tx.date, 구분: tx.type, 금액: tx.amount,
          메모: tx.memo ?? "", 통장분류: tx.account ?? "", 소비항목: tx.category ?? ""
        }));
        const allSheet = XLSX.utils.json_to_sheet(allRows, { header: allHeaders });
        allSheet["!cols"] = [
          { wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
        ];
        XLSX.utils.book_append_sheet(workbook, allSheet, "전체");

        const categoryHeaders = ["날짜", "구분", "금액", "메모", "통장분류"];
        categoryMap.forEach((transactions, category) => {
          const rows = transactions.map(tx => ({
            날짜: tx.date, 구분: tx.type, 금액: tx.amount,
            메모: tx.memo ?? "", 통장분류: tx.account ?? ""
          }));
          const sheet = XLSX.utils.json_to_sheet(rows, { header: categoryHeaders });
          sheet["!cols"] = [{ wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 15 }];
          const sheetName = category.replace(/[\\/*?[\]:]/g, "").substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        });

        XLSX.writeFile(workbook, `${fileBaseName}.xlsx`);
      } else {
        const headers = ["날짜", "구분", "금액", "메모", "통장분류", "소비항목"];
        const formatAmountForCSV = (amount: number) => `₩${amount.toLocaleString('ko-KR')}`;

        const rows = data.map(tx => [
          tx.date, tx.type, formatAmountForCSV(tx.amount),
          (tx.memo ?? "").replace(/"/g, '""'), tx.account ?? "", tx.category ?? ""
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileBaseName}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "내보내기에 실패했어요.";
      setError(message);
    }
  };

  return {
    isExportModalOpen,
    setExportModalOpen,
    isReportModalOpen,
    setReportModalOpen,
    handleOpenExportModal,
    handleExportCSV,
  };
}
