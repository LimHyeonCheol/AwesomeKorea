export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatKoreanDate = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });

export const formatReleaseDateLabel = (value: string | null, fallbackYear?: number | null) => {
  if (value) {
    if (/^\d{4}-\d{2}$/.test(value)) {
      return value.replace("-", ".");
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    return value;
  }

  return fallbackYear ? `${fallbackYear}` : "미정";
};
