export interface ViewportConstraints {
  maxHeight: string;
  maxWidth: string;
  minHeight: string;
  minWidth: string;
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export const defaultViewportConstraints: ViewportConstraints = {
  maxHeight: '90vh',
  maxWidth: '95vw',
  minHeight: '400px',
  minWidth: '320px',
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  }
};

export const getResponsiveWidth = (constraints: ViewportConstraints): string => {
  if (typeof window === 'undefined') return constraints.maxWidth;
  
  const width = window.innerWidth;
  
  if (width < constraints.breakpoints.mobile) {
    return '95vw';
  } else if (width < constraints.breakpoints.tablet) {
    return '85vw';
  } else if (width < constraints.breakpoints.desktop) {
    return '75vw';
  } else {
    return '65vw';
  }
};

export const getResponsiveHeight = (constraints: ViewportConstraints): string => {
  if (typeof window === 'undefined') return constraints.maxHeight;
  
  const height = window.innerHeight;
  
  // Ensure minimum height is respected
  const minHeightPx = parseInt(constraints.minHeight);
  const maxHeightVh = parseInt(constraints.maxHeight);
  const maxHeightPx = (height * maxHeightVh) / 100;
  
  return `${Math.max(minHeightPx, Math.min(maxHeightPx, height * 0.9))}px`;
};

export const useViewportConstraints = (customConstraints?: Partial<ViewportConstraints>) => {
  const constraints = { ...defaultViewportConstraints, ...customConstraints };
  
  return {
    constraints,
    getWidth: () => getResponsiveWidth(constraints),
    getHeight: () => getResponsiveHeight(constraints)
  };
};