import { useState } from "react";
import type { Transaction, TransactionDraft, TransactionType } from "../types";
import {
  createTransaction,
  fetchTransactionsByDateRange,
} from "../services/transactionService";
import { normalizeDraft } from "../utils/calculateSummary";
import type { TabKey } from "../components/layout/TabNavigation";

// 항목명 매핑 테이블 (결제 수단 → 통장분류)
const accountMapping: Record<string, string> = {
  '토스뱅크 체크카드': '토스뱅크',
  '토스뱅크 통장': '토스뱅크',
  '토스 간편결제': '토스뱅크',
  '토뱅': '토스뱅크',
  '카카오페이 머니': '카카오페이',
  '카카오페이 간편결제': '카카오페이',
  '카카오페이': '카카오페이',
  '네이버페이 간편결제': '네이버페이',
  '네이버페이 간편결제(포인트)': '네이버페이',
  '네이버페이': '네이버페이',
  'KB Star*t통장-저축예금': '국민은행',
  'KB Star*t통장': '국민은행',
  'KB': '국민은행',
  '국민은행': '국민은행',
  'KB국민 nori 체크카드(RF)': '국민은행',
  '삼성카드 taptap O': '신용카드',
  '삼성카드': '신용카드',
  'WON 통장': '우리은행',
  'WON': '우리은행',
  '세이프박스': '세이프박스',
};

// 카테고리 매핑 테이블 (CSV 카테고리 → 서버 카테고리)
const categoryMapping: Record<string, string> = {
  '한식': '식비', '일식': '식비', '중식': '식비', '양식': '식비',
  '아시아음식': '식비', '패스트푸드': '식비', '치킨': '식비', '피자': '식비',
  '베이커리': '식비', '디저트/떡': '식비', '아이스크림/빙수': '식비',
  '커피/음료': '카페/음료',
  '맥주/호프': '술/모임', '이자카야': '술/모임', '바(BAR)': '술/모임', '요리주점': '술/모임',
  '생필품': '생활/마트', '마트': '생활/마트', '편의점': '생활/마트', '식재료': '생활/마트',
  '대중교통': '교통비', '택시': '교통비', '주유': '교통비', '시외버스': '교통비',
  '서비스구독': '구독/포인트',
  '약국': '건강/의료', '정형외과': '건강/의료', '병원': '건강/의료', '의료': '건강/의료',
  '신발': '패션/미용', '의류': '패션/미용', '화장품': '패션/미용',
  '공연': '취미', '음악': '취미', '게임': '취미', '스포츠': '취미',
  '여행': '여행/숙박', '숙박비': '여행/숙박',
  '선물': '선물/경조사비',
  '관리비': '월세/관리비', '전기세': '월세/관리비', '가스비': '월세/관리비',
  '인터넷': '통신비/인터넷비', '휴대폰': '통신비/인터넷비',
  '보험': '저축/상조/보험', '차량보험': '저축/상조/보험', '이자/대출': '저축/상조/보험', '저축': '저축/상조/보험',
  '은행': '기타', '증권/투자': '기타',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function mapAccount(paymentMethod: string): string {
  if (!paymentMethod) return '';
  const trimmed = paymentMethod.trim();
  if (accountMapping[trimmed]) return accountMapping[trimmed];

  const sortedKeys = Object.keys(accountMapping).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (trimmed.includes(key) || key.includes(trimmed)) return accountMapping[key];
  }

  if (trimmed.includes('토스') || trimmed.includes('토뱅')) return '토스뱅크';
  if (trimmed.includes('카카오')) return '카카오페이';
  if (trimmed.includes('네이버')) return '네이버페이';
  if (trimmed.includes('KB') || trimmed.includes('국민')) return '국민은행';
  if (trimmed.includes('삼성')) return '신용카드';
  if (trimmed.includes('WON') || trimmed.includes('won')) return '우리은행';
  return trimmed;
}

function mapCategory(mainCategory: string, subCategory: string): string {
  const main = mainCategory?.trim() || '';
  const sub = subCategory?.trim() || '';
  let category = '';
  if (sub && sub !== '미분류') {
    category = sub;
  } else if (main && main !== '미분류') {
    category = main;
  }
  if (category && categoryMapping[category]) return categoryMapping[category];
  return category;
}

function parseAmountFromCSV(amountStr: string): number | null {
  if (!amountStr || amountStr.trim() === "") return null;
  const isNegative = amountStr.trim().startsWith("-");
  const numStr = amountStr.replace(/[^0-9]/g, "");
  if (!numStr) return null;
  const amount = parseFloat(numStr);
  if (isNaN(amount) || amount === 0) return null;
  return isNegative ? -amount : amount;
}

function normalizeMemo(memo: string): string {
  if (!memo) return '';
  let normalized = memo.trim();
  normalized = normalized.replace(/^(송금 내역|토스|카카오페이|네이버페이)\s+/i, '');
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

function extractKeywords(memo: string): string[] {
  if (!memo) return [];
  const keywords: string[] = [];
  const koreanWords = memo.match(/[가-힣]+/g) || [];
  koreanWords.forEach(word => {
    if (word.length >= 2) keywords.push(word.substring(0, 2));
    if (word.length >= 3) keywords.push(word.substring(0, 3));
    keywords.push(word);
  });
  return keywords;
}

function calculateTokenSimilarity(memo1: string, memo2: string): number {
  if (!memo1 || !memo2) return 0;
  const tokens1 = memo1.toLowerCase().split(/[\s\-_()]+/).filter(t => t.length >= 2);
  const tokens2 = memo2.toLowerCase().split(/[\s\-_()]+/).filter(t => t.length >= 2);
  const keywords1 = extractKeywords(memo1);
  const keywords2 = extractKeywords(memo2);
  const allTokens1 = [...tokens1, ...keywords1];
  const allTokens2 = [...tokens2, ...keywords2];
  if (allTokens1.length === 0 || allTokens2.length === 0) return 0;
  const commonTokens = allTokens1.filter(t1 =>
    allTokens2.some(t2 => t1.includes(t2) || t2.includes(t1))
  );
  const allTokens = new Set([...allTokens1, ...allTokens2]);
  return commonTokens.length / allTokens.size;
}

export function useCsvImport(
  filtersMonth: string,
  refetch: () => Promise<void>,
  setError: (error: string | null) => void,
  setLoading: (loading: boolean) => void,
  setActiveTab: (tab: TabKey) => void,
) {
  const [isDragging, setIsDragging] = useState(false);

  const processCSVFile = async (file: File, compareOnly: boolean = false) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      throw new Error('CSV 파일만 가져올 수 있어요.');
    }

    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const utf8Decoder = new TextDecoder("utf-8");
      const text = utf8Decoder.decode(arrayBuffer);
      const content = text.replace(/^\uFEFF/, "");

      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) throw new Error("CSV 파일이 비어있어요.");

      const headerLine = lines[0];
      const headerCells = parseCSVLine(headerLine);
      const isBankSaladFormat = headerCells.some(cell =>
        cell.includes('대분류') || cell.includes('소분류') ||
        cell.includes('결제수단') || cell.includes('결제 수단') || cell.includes('화폐')
      );

      const dataLines = lines.slice(1);
      const drafts: TransactionDraft[] = [];

      const parseDateFromCSV = (dateStr: string): string => {
        const cleanedDateStr = dateStr.replace(/[\r\n\t]/g, " ").trim();
        const isoMatch = cleanedDateStr.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return isoMatch[1];

        const match = cleanedDateStr.match(/(\d+)월\s*(\d+)일/);
        if (match) {
          const monthNum = parseInt(match[1], 10);
          const dayNum = parseInt(match[2], 10);
          const month = String(monthNum).padStart(2, "0");
          const day = String(dayNum).padStart(2, "0");
          const [currentYear, currentMonth] = filtersMonth.split("-").map(Number);
          let year = currentYear;
          if (monthNum > currentMonth && currentMonth <= 3) year = currentYear - 1;
          return `${year}-${month}-${day}`;
        }
        return "";
      };

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const cells = parseCSVLine(line);
        if (cells.length < 3) {
          console.warn(`${i + 2}번째 줄 건너뛰기: 필드 수 부족 (${cells.length}개)`);
          continue;
        }

        let dateStr: string;
        let typeStr: string;
        let amountStr: string;
        let memo: string;
        let account: string;
        let category: string;

        if (isBankSaladFormat) {
          let dateIdx = 0, typeIdx = 2, mainCategoryIdx = 3, subCategoryIdx = 4;
          let contentIdx = 5, amountIdx = 6, paymentMethodIdx = 8, memoIdx = 9;

          const headerDateIdx = headerCells.findIndex(c => c.includes("날짜"));
          const headerTypeIdx = headerCells.findIndex(c => c.includes("타입"));
          const headerMainCategoryIdx = headerCells.findIndex(c => c.includes("대분류"));
          const headerSubCategoryIdx = headerCells.findIndex(c => c.includes("소분류"));
          const headerContentIdx = headerCells.findIndex(c => c.includes("내용"));
          const headerAmountIdx = headerCells.findIndex(c => c.includes("금액"));
          const headerPaymentMethodIdx = headerCells.findIndex(c =>
            c.includes("결제수단") || c.includes("결제 수단")
          );
          const headerMemoIdx = headerCells.findIndex(c => c.includes("메모"));

          if (headerDateIdx >= 0) dateIdx = headerDateIdx;
          if (headerTypeIdx >= 0) typeIdx = headerTypeIdx;
          if (headerMainCategoryIdx >= 0) mainCategoryIdx = headerMainCategoryIdx;
          if (headerSubCategoryIdx >= 0) subCategoryIdx = headerSubCategoryIdx;
          if (headerContentIdx >= 0) contentIdx = headerContentIdx;
          if (headerAmountIdx >= 0) amountIdx = headerAmountIdx;
          if (headerPaymentMethodIdx >= 0) paymentMethodIdx = headerPaymentMethodIdx;
          if (headerMemoIdx >= 0) memoIdx = headerMemoIdx;

          dateStr = cells[dateIdx] || "";
          const rawTypeFromCells = cells[typeIdx] || "";
          typeStr = rawTypeFromCells.trim();
          if (/^\d{1,2}:\d{2}/.test(typeStr) && cells.length > 2) {
            typeStr = (cells[2] || typeStr).trim();
          }

          amountStr = cells[amountIdx] || "";
          const mainCategory = cells[mainCategoryIdx] || "";
          const subCategory = cells[subCategoryIdx] || "";
          const contentVal = cells[contentIdx] || "";
          const paymentMethod = cells[paymentMethodIdx] || "";
          const memoValue = cells[memoIdx] || "";

          memo = [contentVal, memoValue].filter(v => v).join(' ').trim();
          account = mapAccount(paymentMethod);
          category = mapCategory(mainCategory, subCategory);
        } else {
          const looksLikeBankSaladRow =
            cells.length >= 10 &&
            /^\d{4}-\d{2}-\d{2}/.test(cells[0]) &&
            /^\d{1,2}:\d{2}/.test(cells[1]);

          if (looksLikeBankSaladRow) {
            dateStr = cells[0] || "";
            typeStr = (cells[2] || "").trim();
            amountStr = cells[6] || "";
            const mainCategory = cells[3] || "";
            const subCategory = cells[4] || "";
            const contentVal = cells[5] || "";
            const paymentMethod = cells[8] || "";
            const memoValue = cells[9] || "";
            memo = [contentVal, memoValue].filter(v => v).join(" ").trim();
            account = mapAccount(paymentMethod);
            category = mapCategory(mainCategory, subCategory);
          } else {
            [dateStr, typeStr, amountStr, memo = "", account = "", category = ""] = cells;
          }
        }

        const date = parseDateFromCSV(dateStr);
        if (!date) {
          console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 날짜 형식 (${dateStr})`);
          continue;
        }

        const amount = parseAmountFromCSV(amountStr);
        if (amount === null || amount === 0) {
          console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 금액 또는 0원 (${amountStr})`);
          continue;
        }

        let type = (typeStr || "").replace(/\(주\)/g, "").trim();
        if (type && type !== "수입" && type !== "지출" && type !== "이체") {
          if (type.includes("지출")) type = "지출";
          else if (type.includes("수입") || type.includes("입금")) type = "수입";
        }
        if (!type || (type !== "수입" && type !== "지출" && type !== "이체")) {
          if (amount < 0) type = "지출";
          else if (amount > 0) type = "수입";
        }
        if (!type) {
          console.warn(`${i + 2}번째 줄 건너뛰기: 필수 필드 누락`);
          continue;
        }
        if (type === "이체" || type === "이체출금" || type === "이체입금") {
          console.warn(`${i + 2}번째 줄 건너뛰기: 이체 거래는 제외 (${type})`);
          continue;
        }
        if (type !== "수입" && type !== "지출") {
          console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 구분 (${type})`);
          continue;
        }
        if (type === "수입" && amount > 0 && amount <= 9999) {
          console.warn(`${i + 2}번째 줄 건너뛰기: 9,999원 이하 수입은 제외 (${amount}원)`);
          continue;
        }

        drafts.push({
          date,
          type: type as TransactionType,
          account: account || "",
          category: category || "",
          amount,
          memo: memo || "",
        });
      }

      if (drafts.length === 0) throw new Error("가져올 수 있는 데이터가 없어요.");

      // CSV 데이터의 날짜 범위 파악
      const dates = drafts.map(d => d.date).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];

      const addMonths = (ds: string, months: number): string => {
        const [year, month, day] = ds.split('-').map(Number);
        const d = new Date(year, month - 1 + months, day);
        return d.toISOString().split('T')[0];
      };

      const fetchStartDate = addMonths(minDate, -1);
      const fetchEndDate = addMonths(maxDate, 1);

      console.log(`중복 체크를 위해 ${fetchStartDate} ~ ${fetchEndDate} 기간의 데이터를 서버에서 가져옵니다. (CSV 범위: ${minDate} ~ ${maxDate})`);
      const existingTransactions = await fetchTransactionsByDateRange(fetchStartDate, fetchEndDate);

      const findRepeatingPattern = (draft: TransactionDraft): Transaction | null => {
        const draftDate = new Date(draft.date);
        const threeMonthsAgo = new Date(draftDate);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const threeMonthsLater = new Date(draftDate);
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

        const sameAmountTransactions = existingTransactions.filter(tx => {
          const txDate = new Date(tx.date.includes('T') ? tx.date.split('T')[0] : tx.date);
          const amountMatch = Math.abs(Math.abs(tx.amount) - Math.abs(draft.amount)) < 0.01;
          const inDateRange = txDate >= threeMonthsAgo && txDate <= threeMonthsLater;
          return amountMatch && inDateRange;
        });

        if (sameAmountTransactions.length >= 2) {
          return sameAmountTransactions.sort((a, b) => {
            const dateA = new Date(a.date.includes('T') ? a.date.split('T')[0] : a.date);
            const dateB = new Date(b.date.includes('T') ? b.date.split('T')[0] : b.date);
            return dateB.getTime() - dateA.getTime();
          })[0];
        }
        return null;
      };

      const isDuplicate = (draft: TransactionDraft): boolean => {
        return existingTransactions.some(tx => {
          let txDate = tx.date.trim();
          if (txDate.includes('T')) txDate = txDate.split('T')[0];
          const draftDate = draft.date.trim();
          if (txDate !== draftDate) return false;

          const txAmount = Math.abs(Number(tx.amount));
          const draftAmount = Math.abs(Number(draft.amount));
          if (Math.abs(txAmount - draftAmount) > 0.01) return false;

          const txMemo = normalizeMemo(tx.memo ?? "");
          const draftMemo = normalizeMemo(draft.memo ?? "");
          if (!txMemo && !draftMemo) return true;

          const draftMemoOriginal = (draft.memo ?? "").trim();
          if (draftMemoOriginal === "송금 내역" && txMemo) return true;
          if (!txMemo || !draftMemo) return false;
          if (txMemo === draftMemo) return true;

          const longer = txMemo.length > draftMemo.length ? txMemo : draftMemo;
          const shorter = txMemo.length > draftMemo.length ? draftMemo : txMemo;
          if (shorter.length >= 3 && longer.includes(shorter)) return true;

          const similarity = calculateTokenSimilarity(txMemo, draftMemo);
          if (similarity >= 0.25) return true;

          const repeatingTx = findRepeatingPattern(draft);
          if (repeatingTx) {
            const amountMatch = Math.abs(Math.abs(tx.amount) - Math.abs(draft.amount)) < 0.01;
            if (amountMatch) {
              const repeatingMemo = normalizeMemo(repeatingTx.memo ?? "");
              if (repeatingMemo) {
                const repeatSimilarity = calculateTokenSimilarity(draftMemo, repeatingMemo);
                if (repeatSimilarity >= 0.15) return true;
                if (repeatingMemo.length >= 2 && draftMemo.includes(repeatingMemo)) return true;
                if (draftMemo.length >= 2 && repeatingMemo.includes(draftMemo)) return true;
                if (/^\d+$/.test(draftMemo) && repeatingMemo.length >= 2) return true;
                if (tx.id === repeatingTx.id && draftDate === txDate) return true;
              }
            }
          }
          return false;
        });
      };

      // 최근 1개월치만 필터링
      const today = new Date();
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

      const recentDrafts = drafts.filter(draft => draft.date >= oneMonthAgoStr);
      const excludedCount = drafts.length - recentDrafts.length;
      if (excludedCount > 0) {
        console.log(`⏭️  1개월 이전 데이터 ${excludedCount}개는 제외되었습니다. (${oneMonthAgoStr} 이전)`);
      }

      const newDrafts = recentDrafts.filter(draft => !isDuplicate(draft));
      const duplicateCount = recentDrafts.length - newDrafts.length;

      if (compareOnly) {
        const totalCSV = recentDrafts.length;
        const matchedCount = duplicateCount;
        const unmatchedCount = newDrafts.length;
        const matchRate = totalCSV > 0 ? (matchedCount / totalCSV * 100).toFixed(2) : '0.00';

        const message = `📊 CSV vs 서버 데이터 비교 결과\n\n` +
          `CSV 전체: ${drafts.length}개\n` +
          `최근 1개월: ${totalCSV}개 (${oneMonthAgoStr} 이후)\n` +
          `서버 일치 항목: ${matchedCount}개\n` +
          `서버 미일치 항목: ${unmatchedCount}개\n` +
          `일치율: ${matchRate}%\n\n` +
          `기간: ${minDate} ~ ${maxDate}\n` +
          `서버 데이터: ${existingTransactions.length}개`;

        alert(message);
        console.log('CSV 비교 상세:', {
          csvTotal: drafts.length,
          recentCSV: totalCSV,
          serverTotal: existingTransactions.length,
          matched: matchedCount,
          unmatched: unmatchedCount,
          matchRate: `${matchRate}%`,
          unmatchedItems: newDrafts.slice(0, 10)
        });
        return;
      }

      if (newDrafts.length === 0) {
        alert(`모든 항목이 이미 존재합니다. (중복 ${duplicateCount}개)`);
        return;
      }

      for (const draft of newDrafts) {
        await createTransaction(normalizeDraft(draft));
      }

      await refetch();

      let message = `${newDrafts.length}개의 내역을 가져왔어요.`;
      if (duplicateCount > 0) message += `\n(중복 ${duplicateCount}개는 건너뛰었어요.)`;
      if (excludedCount > 0) message += `\n(1개월 이전 ${excludedCount}개는 제외되었어요.)`;
      alert(message);
      setActiveTab("history");
    } catch (err) {
      const message = err instanceof Error ? err.message : "CSV 가져오기에 실패했어요.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,.xlsx,.xls";
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) await processCSVFile(file);
      };
      input.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : "파일을 선택하지 못했어요.";
      setError(message);
    }
  };

  const handleCompareCSV = () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv";
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) await processCSVFile(file, true);
      };
      input.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : "파일을 선택하지 못했어요.";
      setError(message);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    if (csvFile) {
      await processCSVFile(csvFile);
    } else if (files.length > 0) {
      setError('CSV 파일만 드롭할 수 있어요.');
    }
  };

  return {
    isDragging,
    handleImportCSV,
    handleCompareCSV,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
