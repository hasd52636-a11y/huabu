/**
 * Cache Busting and Runtime Verification Script
 * 
 * This script helps identify and resolve browser caching issues that might
 * be preventing the VEO model routing fixes from taking effect.
 */

// Add unique build timestamp to verify latest code is running
window.VEO_FIX_BUILD_ID = 'VEO-FIX-' + Date.now();
console.log('[CACHE-BUSTER] Build ID:', window.VEO_FIX_BUILD_ID);

// Force cache refresh for critical files
const criticalFiles = [
  '/App.tsx',
  '/types.ts', 
  '/adapters/AIServiceAdapter.ts',
  '/services/shenmaService.ts'
];

// Add cache-busting parameters to fetch requests
const originalFetch = window.fetch;
window.fetch = function(input, init) {
  if (typeof input === 'string' && criticalFiles.some(file => input.includes(file))) {
    const url = new URL(input, window.location.origin);
    url.searchParams.set('_cb', Date.now().toString());
    input = url.toString();
    console.log('[CACHE-BUSTER] Cache-busted URL:', input);
  }
  return originalFetch.call(this, input, init);
};

// Verify debug logging is working
setTimeout(() => {
  console.log('[CACHE-BUSTER] Verification check - looking for VEO debug messages...');
  
  // Check if our debug markers are present in the console
  const hasVeoDebug = console.log.toString().includes('VEO-DEBUG') || 
                      window.console._logs?.some(log => log.includes('VEO-DEBUG'));
  
  if (!hasVeoDebug) {
    console.warn('[CACHE-BUSTER] ⚠️ VEO debug messages not detected. Possible caching issue.');
    console.warn('[CACHE-BUSTER] Try: Hard refresh (Ctrl+Shift+R), clear cache, or disable cache in DevTools');
  } else {
    console.log('[CACHE-BUSTER] ✅ VEO debug system appears to be active');
  }
}, 2000);

// Export for global access
window.cacheBuster = {
  buildId: window.VEO_FIX_BUILD_ID,
  clearCache: () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
          console.log('[CACHE-BUSTER] Cleared cache:', name);
        });
      });
    }
    localStorage.clear();
    sessionStorage.clear();
    console.log('[CACHE-BUSTER] Cleared all storage');
  },
  forceReload: () => {
    window.location.reload(true);
  }
};