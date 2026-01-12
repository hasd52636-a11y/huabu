export interface PopoverPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
}

export interface PopoverOptions {
  placement?: PopoverPosition['placement'];
  offset?: number;
  arrowOffset?: number;
  fitInViewport?: boolean;
  flip?: boolean;
}

/**
 * Calculate the position for a popover based on the reference element
 */
export const calculatePopoverPosition = (
  referenceElement: HTMLElement,
  popoverElement: HTMLElement,
  options: PopoverOptions = {}
): PopoverPosition => {
  const { 
    placement = 'bottom', 
    offset = 8, 
    arrowOffset = 16, 
    fitInViewport = true, 
    flip = true 
  } = options;

  const referenceRect = referenceElement.getBoundingClientRect();
  const popoverRect = popoverElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  let pos: PopoverPosition = {
    top: 0,
    left: 0,
    placement
  };

  // Base position calculation
  switch (placement) {
    case 'top':
      pos = {
        top: referenceRect.top - popoverRect.height - offset,
        left: referenceRect.left + (referenceRect.width - popoverRect.width) / 2,
        placement
      };
      break;
    case 'top-start':
      pos = {
        top: referenceRect.top - popoverRect.height - offset,
        left: referenceRect.left,
        placement
      };
      break;
    case 'top-end':
      pos = {
        top: referenceRect.top - popoverRect.height - offset,
        left: referenceRect.right - popoverRect.width,
        placement
      };
      break;
    case 'bottom':
      pos = {
        top: referenceRect.bottom + offset,
        left: referenceRect.left + (referenceRect.width - popoverRect.width) / 2,
        placement
      };
      break;
    case 'bottom-start':
      pos = {
        top: referenceRect.bottom + offset,
        left: referenceRect.left,
        placement
      };
      break;
    case 'bottom-end':
      pos = {
        top: referenceRect.bottom + offset,
        left: referenceRect.right - popoverRect.width,
        placement
      };
      break;
    case 'left':
      pos = {
        top: referenceRect.top + (referenceRect.height - popoverRect.height) / 2,
        left: referenceRect.left - popoverRect.width - offset,
        placement
      };
      break;
    case 'left-start':
      pos = {
        top: referenceRect.top,
        left: referenceRect.left - popoverRect.width - offset,
        placement
      };
      break;
    case 'left-end':
      pos = {
        top: referenceRect.bottom - popoverRect.height,
        left: referenceRect.left - popoverRect.width - offset,
        placement
      };
      break;
    case 'right':
      pos = {
        top: referenceRect.top + (referenceRect.height - popoverRect.height) / 2,
        left: referenceRect.right + offset,
        placement
      };
      break;
    case 'right-start':
      pos = {
        top: referenceRect.top,
        left: referenceRect.right + offset,
        placement
      };
      break;
    case 'right-end':
      pos = {
        top: referenceRect.bottom - popoverRect.height,
        left: referenceRect.right + offset,
        placement
      };
      break;
  }

  // Adjust for viewport
  if (fitInViewport) {
    pos.left = Math.max(0, Math.min(pos.left, viewport.width - popoverRect.width));
    pos.top = Math.max(0, Math.min(pos.top, viewport.height - popoverRect.height));
  }

  // Add scroll offsets
  pos.left += window.scrollX;
  pos.top += window.scrollY;

  return pos;
};

/**
 * Create a click outside event listener
 */
export const createClickOutsideHandler = (
  element: HTMLElement,
  callback: () => void
): (event: MouseEvent | TouchEvent) => void => {
  const handler = (event: MouseEvent | TouchEvent) => {
    if (!element.contains(event.target as Node)) {
      callback();
    }
  };

  return handler;
};

/**
 * Create an escape key event listener
 */
export const createEscapeKeyHandler = (
  callback: () => void
): (event: KeyboardEvent) => void => {
  const handler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      callback();
    }
  };

  return handler;
};

/**
 * Add click outside and escape key listeners
 */
export const addPopoverListeners = (
  element: HTMLElement,
  onClose: () => void
): (() => void) => {
  const clickOutsideHandler = createClickOutsideHandler(element, onClose);
  const escapeKeyHandler = createEscapeKeyHandler(onClose);

  document.addEventListener('mousedown', clickOutsideHandler);
  document.addEventListener('touchstart', clickOutsideHandler);
  document.addEventListener('keydown', escapeKeyHandler);

  // Return cleanup function
  return () => {
    document.removeEventListener('mousedown', clickOutsideHandler);
    document.removeEventListener('touchstart', clickOutsideHandler);
    document.removeEventListener('keydown', escapeKeyHandler);
  };
};

/**
 * Get the best placement based on available space
 */
export const getBestPlacement = (
  referenceElement: HTMLElement,
  popoverElement: HTMLElement,
  preferredPlacements: PopoverPosition['placement'][] = ['bottom', 'top', 'right', 'left']
): PopoverPosition['placement'] => {
  const referenceRect = referenceElement.getBoundingClientRect();
  const popoverRect = popoverElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  const spaces = {
    top: referenceRect.top,
    bottom: viewport.height - referenceRect.bottom,
    left: referenceRect.left,
    right: viewport.width - referenceRect.right
  };

  const hasEnoughSpace = (placement: PopoverPosition['placement']): boolean => {
    const basePlacement = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
    
    if (basePlacement === 'top' || basePlacement === 'bottom') {
      return spaces[basePlacement] >= popoverRect.height;
    } else {
      return spaces[basePlacement] >= popoverRect.width;
    }
  };

  // Find the first placement with enough space
  for (const placement of preferredPlacements) {
    if (hasEnoughSpace(placement)) {
      return placement;
    }
  }

  // Fallback to the first preferred placement
  return preferredPlacements[0];
};

/**
 * Calculate arrow position based on popover placement
 */
export const calculateArrowPosition = (
  referenceElement: HTMLElement,
  popoverElement: HTMLElement,
  popoverPosition: PopoverPosition,
  arrowElement: HTMLElement,
  options: { offset?: number } = {}
): { top: string; left: string } => {
  const { offset = 16 } = options;
  const referenceRect = referenceElement.getBoundingClientRect();
  const popoverRect = popoverElement.getBoundingClientRect();
  const arrowRect = arrowElement.getBoundingClientRect();

  const arrowPosition = {
    top: '0px',
    left: '0px'
  };

  switch (popoverPosition.placement) {
    case 'top':
    case 'bottom':
      const centerOffset = (referenceRect.left + referenceRect.width / 2) - popoverRect.left;
      arrowPosition.left = `${Math.max(offset, Math.min(centerOffset, popoverRect.width - arrowRect.width - offset))}px`;
      arrowPosition.top = popoverPosition.placement === 'top' ? `${popoverRect.height - arrowRect.height}px` : `-${arrowRect.height}px`;
      break;

    case 'left':
    case 'right':
      const middleOffset = (referenceRect.top + referenceRect.height / 2) - popoverRect.top;
      arrowPosition.top = `${Math.max(offset, Math.min(middleOffset, popoverRect.height - arrowRect.height - offset))}px`;
      arrowPosition.left = popoverPosition.placement === 'left' ? `${popoverRect.width - arrowRect.width}px` : `-${arrowRect.width}px`;
      break;

    case 'top-start':
    case 'bottom-start':
      arrowPosition.left = `${offset}px`;
      arrowPosition.top = popoverPosition.placement === 'top-start' ? `${popoverRect.height - arrowRect.height}px` : `-${arrowRect.height}px`;
      break;

    case 'top-end':
    case 'bottom-end':
      arrowPosition.left = `${popoverRect.width - arrowRect.width - offset}px`;
      arrowPosition.top = popoverPosition.placement === 'top-end' ? `${popoverRect.height - arrowRect.height}px` : `-${arrowRect.height}px`;
      break;

    case 'left-start':
    case 'right-start':
      arrowPosition.top = `${offset}px`;
      arrowPosition.left = popoverPosition.placement === 'left-start' ? `${popoverRect.width - arrowRect.width}px` : `-${arrowRect.width}px`;
      break;

    case 'left-end':
    case 'right-end':
      arrowPosition.top = `${popoverRect.height - arrowRect.height - offset}px`;
      arrowPosition.left = popoverPosition.placement === 'left-end' ? `${popoverRect.width - arrowRect.width}px` : `-${arrowRect.width}px`;
      break;
  }

  return arrowPosition;
};

/**
 * Set popover position with animation support
 */
export const setPopoverPosition = (
  popoverElement: HTMLElement,
  position: PopoverPosition,
  animate: boolean = true
): void => {
  if (animate) {
    popoverElement.style.transition = 'all 0.2s ease';
  } else {
    popoverElement.style.transition = 'none';
  }

  popoverElement.style.position = 'absolute';
  popoverElement.style.top = `${position.top}px`;
  popoverElement.style.left = `${position.left}px`;
  popoverElement.dataset.placement = position.placement;
};

/**
 * Check if an element is visible in the viewport
 */
export const isElementInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Scroll element into view if it's not fully visible
 */
export const scrollElementIntoView = (element: HTMLElement): void => {
  if (!isElementInViewport(element)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
};