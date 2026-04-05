import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * 
 * Automatically resets the window scroll position to (0, 0) whenever
 * the application route changes. This prevents the "scrolled-to-bottom"
 * issue when navigating from a long page to a new page in v1.1.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
