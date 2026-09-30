'use client';

import { useEffect } from 'react';

const NEO_FAVICON_SVG = `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%20fill%3D%22none%22%3E%3Crect%20x%3D%229%22%20y%3D%229%22%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2213%22%20fill%3D%22%23000000%22/%3E%3Crect%20x%3D%225%22%20y%3D%225%22%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2213%22%20fill%3D%22%23FFE600%22%20stroke%3D%22%23000000%22%20stroke-width%3D%223.5%22%20stroke-linejoin%3D%22round%22/%3E%3Cpath%20d%3D%22M%205%2020%20L%2020%205%20H%2030%20L%205%2030%20Z%22%20fill%3D%22%2300F0FF%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222.5%22%20stroke-linejoin%3D%22round%22/%3E%3Cpath%20d%3D%22M%2047%207%20C%2047%2011.5%2044%2013.5%2041%2014%20C%2044%2014.5%2047%2016.5%2047%2021%20C%2047.5%2016.5%2050.5%2014.5%2053.5%2014%20C%2050.5%2013.5%2047.5%2011.5%2047%207%20Z%22%20fill%3D%22%23FF4081%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.6%22%20stroke-linejoin%3D%22round%22/%3E%3Ccircle%20cx%3D%2247%22%20cy%3D%2214%22%20r%3D%221%22%20fill%3D%22%23FFFFFF%22/%3E%3Cpath%20d%3D%22M%2018%2025%20H%2040%20C%2045%2025%2048%2028.5%2047%2034.5%20L%2045.5%2042%20C%2044.2%2045%2040.5%2045.5%2038%2043%20C%2035.5%2040.5%2034%2038.5%2029%2038.5%20C%2024%2038.5%2022.5%2040.5%2020%2043%20C%2017.5%2045%2013.8%2045%2012.5%2042%20L%2011%2034.5%20C%2010%2028.5%2013%2025%2018%2025%20Z%22%20fill%3D%22%23000000%22/%3E%3Cpath%20d%3D%22M%2018%2022%20H%2040%20C%2045%2022%2048%2025.5%2047%2031.5%20L%2045.5%2039%20C%2044.2%2042%2040.5%2042.5%2038%2040%20C%2035.5%2037.5%2034%2035.5%2029%2035.5%20C%2024%2035.5%2022.5%2037.5%2020%2040%20C%2017.5%2042%2013.8%2042%2012.5%2039%20L%2011%2031.5%20C%2010%2025.5%2013%2022%2018%2022%20Z%22%20fill%3D%22%230B0819%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222.6%22%20stroke-linejoin%3D%22round%22/%3E%3Cpath%20d%3D%22M%2017.5%2026.5%20H%2020.5%20V%2029%20H%2023%20V%2032%20H%2020.5%20V%2034.5%20H%2017.5%20V%2032%20H%2015%20V%2029%20H%2017.5%20V%2026.5%20Z%22%20fill%3D%22%23A3E635%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22%20stroke-linejoin%3D%22miter%22/%3E%3Ccircle%20cx%3D%2237.5%22%20cy%3D%2226.5%22%20r%3D%222.2%22%20fill%3D%22%2300F0FF%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2241.5%22%20cy%3D%2230.5%22%20r%3D%222.2%22%20fill%3D%22%23FF4081%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2237.5%22%20cy%3D%2234.5%22%20r%3D%222.2%22%20fill%3D%22%23FFE600%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2233.5%22%20cy%3D%2230.5%22%20r%3D%222.2%22%20fill%3D%22%23A3E635%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2229%22%20cy%3D%2225.5%22%20r%3D%221.2%22%20fill%3D%22%2300F0FF%22%20stroke%3D%22%23000000%22%20stroke-width%3D%220.8%22/%3E%3Crect%20x%3D%2225.5%22%20y%3D%2229.5%22%20width%3D%222.8%22%20height%3D%221.3%22%20rx%3D%220.65%22%20fill%3D%22%23FF4081%22%20stroke%3D%22%23000000%22%20stroke-width%3D%220.7%22%20transform%3D%22rotate(-15%2026.9%2030.1)%22/%3E%3Crect%20x%3D%2229.5%22%20y%3D%2229.5%22%20width%3D%222.8%22%20height%3D%221.3%22%20rx%3D%220.65%22%20fill%3D%22%23FFE600%22%20stroke%3D%22%23000000%22%20stroke-width%3D%220.7%22%20transform%3D%22rotate(-15%2030.9%2030.1)%22/%3E%3C/svg%3E`;

export default function FaviconManager() {
  useEffect(() => {
    try {
      // 1. Remove all old/stale favicon links to trigger browser tab favicon update
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach((el) => {
        const parent = el && el.parentNode;
        if (parent && parent.removeChild) parent.removeChild(el);
      });

      // 2. Create and append the fresh Neo-Brutalist SVG data-uri icon
      const svgLink = document.createElement('link');
      svgLink.rel = 'icon';
      svgLink.type = 'image/svg+xml';
      svgLink.href = NEO_FAVICON_SVG;
      document.head.appendChild(svgLink);

      // 3. Create and append the shortcut icon
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.type = 'image/svg+xml';
      shortcutLink.href = NEO_FAVICON_SVG;
      document.head.appendChild(shortcutLink);

      // 4. Fallback alternate PNG link with cache-busting timestamp
      const pngLink = document.createElement('link');
      pngLink.rel = 'alternate icon';
      pngLink.type = 'image/png';
      pngLink.href = `/neo-icon.png?v=${Date.now()}`;
      document.head.appendChild(pngLink);
    } catch (e) {
      console.warn('Favicon update error:', e);
    }
  }, []);

  return null;
}
