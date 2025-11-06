// 카테고리별 이모지 매핑
export const categoryIcons: Record<string, string> = {
  // 수입
  "급여": "💰",
  "용돈": "💵",
  "그 외": "💳",

  // 지출
  "저축/상조/보험": "🏦",
  "기타": "📋",
  "여행/숙박": "✈️",
  "데이트": "💕",
  "상납금": "🎁",
  "식비": "🍽️",
  "월세/관리비": "🏠",
  "선물/경조사비": "🎊",
  "취미": "🎨",
  "통신비/인터넷비": "📱",
  "교통비": "🚗",
  "생활/마트": "🛒",
  "카페/음료": "☕",
  "구독/포인트": "📺",
  "편의점": "🏪",
  "여가": "🎬",
};

// 계좌별 이모지 매핑
export const accountIcons: Record<string, string> = {
  "국민은행": "🏦",
  "토스뱅크": "💳",
  "우리은행": "🏦",
  "신용카드": "💳",
  "카카오페이": "💰",
  "카카오뱅크": "🏦",
  "현금": "💵",
  "토스 카드": "💳",
  "카카오 체크카드": "💳",
  "우리은행 월급통장": "🏦",
};

// 계좌별 색상 매핑
export const accountColors: Record<string, string> = {
  "토스뱅크": "blue",
  "토스 카드": "blue",
  "토스증권": "blue",
  "카카오뱅크": "yellow",
  "카카오페이": "yellow",
  "카카오 체크카드": "yellow",
  "카카오 카드": "yellow",
  "우리은행": "blue",
  "우리은행 월급통장": "blue",
  "국민은행": "blue",
  "신용카드": "red",
  "현금": "blue",
};

// 이모지 가져오기 함수
export function getCategoryIcon(category: string | null | undefined): string {
  if (!category) return "📋";
  return categoryIcons[category] || "📋";
}

export function getAccountIcon(account: string | null | undefined): string {
  if (!account) return "💳";
  return accountIcons[account] || "💳";
}

export function getAccountColor(account: string): string {
  return accountColors[account] || "blue";
}
