
export const generateId = (length: number = 8): string => {
  return Math.random().toString(36).substring(2, 2 + length);
};

export const getShareIdFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('watch') || params.get('shareId'); // 兼容两种参数名
};

export const createShareUrl = (shareId: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('watch', shareId); // 使用 watch 参数名
  return url.toString();
};

export const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  } as T;
};
