'use client';

/**
 * src/hooks/useBiltyMasterData.ts
 *
 * Encapsulates all master / reference data loading for the bilty form.
 * Strategy: cache-first (always hydrate from IndexedDB immediately, then
 * refresh from the network when online).  This ensures the form is never
 * blank after a page refresh while offline.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUser }      from '@/lib/auth';
import { apiFetch }     from '@/lib/api';
import { useRouter }    from 'next/navigation';
import {
  saveMasterCache,
  loadMasterCache,
  CACHE_KEYS,
} from '@/lib/masterDataCache';
import type {
  Book, Consignor, Consignee, City, Transport,
  PrimaryTemplate, BiltyDiscount,
} from '@/components/dashboard/bilty/types';

type RawCacheData = Record<string, unknown> | null;

interface MasterBundle {
  bookData:  RawCacheData;
  tplData:   RawCacheData;
  crData:    RawCacheData;
  ceData:    RawCacheData;
  cityData:  RawCacheData;
  tpData:    RawCacheData;
  discData:  RawCacheData;
  ctData:    RawCacheData;
}

export interface UseBiltyMasterDataOptions {
  /** Called whenever primaryBook is loaded (initial or refresh). */
  onBookLoaded?: (book: Book) => void;
}

export function useBiltyMasterData({ onBookLoaded }: UseBiltyMasterDataOptions = {}) {
  const router = useRouter();

  const [primaryBook,      setPrimaryBook]      = useState<Book | null>(null);
  const [primaryTemplate,  setPrimaryTemplate]  = useState<PrimaryTemplate | null>(null);
  const [noPrimaryBook,    setNoPrimaryBook]     = useState(false);
  const [consignors,       setConsignors]        = useState<Consignor[]>([]);
  const [consignees,       setConsignees]        = useState<Consignee[]>([]);
  const [cities,           setCities]            = useState<City[]>([]);
  const [transports,       setTransports]        = useState<Transport[]>([]);
  const [discounts,        setDiscounts]         = useState<BiltyDiscount[]>([]);
  const [cityTransportMap, setCityTransportMap]  = useState<Record<string, string>>({});
  const [dropLoading,      setDropLoading]       = useState(true);

  // Keep onBookLoaded stable across renders without re-triggering useEffect
  const onBookLoadedRef = useRef(onBookLoaded);
  useEffect(() => { onBookLoadedRef.current = onBookLoaded; }, [onBookLoaded]);

  /** Apply a raw data bundle to React state. */
  function applyBundle({ bookData, tplData, crData, ceData, cityData, tpData, discData, ctData }: MasterBundle, isNot404 = true) {
    const cityList: City[]      = (cityData as { cities?: City[] })?.cities      ?? (cityData as City[] | null)      ?? [];
    const tpList:   Transport[] = (tpData   as { transports?: Transport[] })?.transports ?? (tpData   as Transport[] | null) ?? [];
    setCities(cityList);
    setTransports(tpList);
    setConsignors((crData   as { consignors?: Consignor[]   })?.consignors   ?? (crData   as Consignor[]   | null)   ?? []);
    setConsignees((ceData   as { consignees?: Consignee[]   })?.consignees   ?? (ceData   as Consignee[]   | null)   ?? []);
    setDiscounts( (discData as { discounts?: BiltyDiscount[] })?.discounts   ?? (discData as BiltyDiscount[] | null) ?? []);

    if (tplData) {
      setPrimaryTemplate((tplData as { template?: PrimaryTemplate })?.template ?? tplData as unknown as PrimaryTemplate);
    }

    const ctLinks: { city_id: string; transport_id: string }[] =
      (ctData as { city_transports?: { city_id: string; transport_id: string }[] })?.city_transports ??
      (ctData as { links?: { city_id: string; transport_id: string }[] })?.links ?? [];
    const ctMap: Record<string, string> = {};
    ctLinks.forEach(l => { if (!ctMap[l.city_id]) ctMap[l.city_id] = l.transport_id; });
    setCityTransportMap(ctMap);

    if (bookData && isNot404) {
      const book: Book = (bookData as { book?: Book })?.book ?? bookData as unknown as Book;
      setPrimaryBook(book);
      onBookLoadedRef.current?.(book);
    }
  }

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }

    async function load() {
      setDropLoading(true);
      try {
        // ── Step 1: Hydrate from IndexedDB immediately (works offline + on refresh) ──
        const cacheResults = await Promise.all([
          loadMasterCache<RawCacheData>(CACHE_KEYS.PRIMARY_BOOK),
          loadMasterCache<RawCacheData>(CACHE_KEYS.PRIMARY_TPL),
          loadMasterCache<RawCacheData>(CACHE_KEYS.CONSIGNORS),
          loadMasterCache<RawCacheData>(CACHE_KEYS.CONSIGNEES),
          loadMasterCache<RawCacheData>(CACHE_KEYS.CITIES),
          loadMasterCache<RawCacheData>(CACHE_KEYS.TRANSPORTS),
          loadMasterCache<RawCacheData>(CACHE_KEYS.DISCOUNTS),
          loadMasterCache<RawCacheData>(CACHE_KEYS.CITY_TRANSPORTS),
        ]);
        const [cbookData, ctplData, ccrData, cceData, ccityData, ctpData, cdiscData, cctData] = cacheResults;
        applyBundle({
          bookData: cbookData, tplData: ctplData, crData: ccrData, ceData: cceData,
          cityData: ccityData, tpData: ctpData, discData: cdiscData, ctData: cctData,
        });

        // ── Step 2: If offline, we're done (cache data is already shown) ──────────
        if (!navigator.onLine) return;

        // ── Step 3: Refresh from network and re-cache ─────────────────────────────
        const [bRes, tRes, crRes, ceRes, cityRes, tpRes, discRes, ctRes] = await Promise.all([
          apiFetch(`/v1/bilty-setting/books/primary?bilty_type=REGULAR`),
          apiFetch(`/v1/bilty-setting/templates/primary`),
          apiFetch(`/v1/bilty-setting/consignors?is_active=true`),
          apiFetch(`/v1/bilty-setting/consignees?is_active=true`),
          apiFetch(`/v1/master/cities?is_active=true`),
          apiFetch(`/v1/master/transports?is_active=true`),
          apiFetch(`/v1/bilty-setting/discounts?is_active=true`),
          apiFetch(`/v1/master/city-transports`),
        ]);

        const [bookData, tplData, crData, ceData, cityData, tpData, discData, ctData] = await Promise.all([
          (bRes.ok || bRes.status === 404) ? bRes.json().catch(  () => null) : null,
          tRes.ok   ? tRes.json().catch(   () => null) : null,
          crRes.ok  ? crRes.json().catch(  () => null) : null,
          ceRes.ok  ? ceRes.json().catch(  () => null) : null,
          cityRes.ok  ? cityRes.json().catch(() => null) : null,
          tpRes.ok    ? tpRes.json().catch( () => null) : null,
          discRes.ok  ? discRes.json().catch(() => null) : null,
          ctRes.ok    ? ctRes.json().catch( () => null) : null,
        ]);

        if (bRes.status === 404) setNoPrimaryBook(true);

        applyBundle(
          { bookData, tplData, crData, ceData, cityData, tpData, discData, ctData },
          bRes.status !== 404,
        );

        // Persist fresh data to cache
        await Promise.all([
          bookData  ? saveMasterCache(CACHE_KEYS.PRIMARY_BOOK,    bookData)  : null,
          tplData   ? saveMasterCache(CACHE_KEYS.PRIMARY_TPL,     tplData)   : null,
          crData    ? saveMasterCache(CACHE_KEYS.CONSIGNORS,      crData)    : null,
          ceData    ? saveMasterCache(CACHE_KEYS.CONSIGNEES,      ceData)    : null,
          cityData  ? saveMasterCache(CACHE_KEYS.CITIES,          cityData)  : null,
          tpData    ? saveMasterCache(CACHE_KEYS.TRANSPORTS,      tpData)    : null,
          discData  ? saveMasterCache(CACHE_KEYS.DISCOUNTS,       discData)  : null,
          ctData    ? saveMasterCache(CACHE_KEYS.CITY_TRANSPORTS, ctData)    : null,
        ]);
      } catch { /* Network errors are OK — cache data is already shown */ }
      finally { setDropLoading(false); }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Re-fetch only the primary book (call after creating a new bilty). */
  const refreshPrimaryBook = useCallback(async () => {
    try {
      const res = await apiFetch(`/v1/bilty-setting/books/primary?bilty_type=REGULAR`);
      if (res.ok) {
        const raw  = await res.json();
        const book: Book = raw.book ?? raw;
        setPrimaryBook(book);
        setNoPrimaryBook(false);
        onBookLoadedRef.current?.(book);
        saveMasterCache(CACHE_KEYS.PRIMARY_BOOK, raw).catch(() => {});
      }
    } catch { /* silent */ }
  }, []);

  return {
    primaryBook, primaryTemplate, noPrimaryBook,
    consignors, consignees, cities, transports, discounts, cityTransportMap,
    dropLoading, refreshPrimaryBook,
  };
}
