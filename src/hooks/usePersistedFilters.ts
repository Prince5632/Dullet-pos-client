import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { persistenceService, PERSIST_NS } from "../services/persistenceService";

export type SortOrder = "asc" | "desc";

export interface PaginationState {
  page: number;
  limit: number;
}

export interface SortState {
  sortBy: string;
  sortOrder: SortOrder;
}

export interface CommonFiltersState {
  search: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  showFilters?: boolean;
}

export interface UsePersistedFiltersOptions<T extends object> {
  namespace: keyof typeof PERSIST_NS | string;
  defaultFilters: CommonFiltersState & T;
  defaultPagination?: PaginationState;
  defaultSort?: SortState;
}

export interface UsePersistedFiltersReturn<T extends object> {
  filters: (CommonFiltersState & T);
  setFilters: (next: Partial<CommonFiltersState & T>) => void;
  pagination: PaginationState;
  setPagination: (next: Partial<PaginationState>) => void;
  sort: SortState;
  setSort: (next: Partial<SortState>) => void;
  clearAll: () => void;
  isPersisted: boolean;
}

export function usePersistedFilters<T extends object>(opts: UsePersistedFiltersOptions<T>): UsePersistedFiltersReturn<T> {
  const { namespace, defaultFilters, defaultPagination = { page: 1, limit: 10 }, defaultSort = { sortBy: "createdAt", sortOrder: "desc" } } = opts;
  const ns = typeof namespace === "string" ? namespace : PERSIST_NS[namespace as keyof typeof PERSIST_NS];

  const initialFilters = useMemo(() => {
    return persistenceService.getNS<typeof defaultFilters>(ns, "filters", defaultFilters);
  }, [ns]);

  const initialPagination = useMemo(() => {
    return persistenceService.getNS<PaginationState>(ns, "pagination", defaultPagination);
  }, [ns]);

  const initialSort = useMemo(() => {
    return persistenceService.getNS<SortState>(ns, "sort", defaultSort);
  }, [ns]);

  const [filters, setFiltersState] = useState(initialFilters);
  const [pagination, setPaginationState] = useState(initialPagination);
  const [sort, setSortState] = useState(initialSort);
  const mountedRef = useRef(false);

  const persistAll = useCallback(() => {
    persistenceService.setNS(ns, "filters", filters);
    persistenceService.setNS(ns, "pagination", pagination);
    persistenceService.setNS(ns, "sort", sort);
  }, [ns, filters, pagination, sort]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // initial state already loaded from storage
      return;
    }
    persistAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination, sort]);

  const setFilters = useCallback((next: Partial<CommonFiltersState & T>) => {
    setFiltersState(prev => {
      const merged = { ...prev, ...next };
      return merged;
    });
  }, []);

  const setPagination = useCallback((next: Partial<PaginationState>) => {
    setPaginationState(prev => {
      const merged = { ...prev, ...next } as PaginationState;
      return merged;
    });
  }, []);

  const setSort = useCallback((next: Partial<SortState>) => {
    setSortState(prev => ({ ...prev, ...next } as SortState));
  }, []);

  const clearAll = useCallback(() => {
    persistenceService.clearNamespace(ns);
    setFiltersState(defaultFilters);
    setPaginationState(defaultPagination);
    setSortState(defaultSort);
  }, [ns, defaultFilters, defaultPagination, defaultSort]);

  const isPersisted = persistenceService.namespaceHasData(ns);

  return {
    filters,
    setFilters,
    pagination,
    setPagination,
    sort,
    setSort,
    clearAll,
    isPersisted,
  };
}