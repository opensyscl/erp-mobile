import { create } from 'zustand';
import { setTenant as setApiTenant } from '~/lib/api';
import { secureStorage, StorageKeys } from '~/lib/storage';
import type { Branch, Tenant } from '~/types/api';

interface TenantState {
  slug: string | null;
  tenant: Tenant | null;
  branches: Branch[];
  currentBranchId: number | null;
  setSlug: (slug: string | null) => Promise<void>;
  setTenantData: (tenant: Tenant, branches: Branch[]) => Promise<void>;
  setCurrentBranch: (id: number) => Promise<void>;
  reset: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  slug: null,
  tenant: null,
  branches: [],
  currentBranchId: null,

  setSlug: async (slug) => {
    set({ slug });
    setApiTenant(slug);
  },

  setTenantData: async (tenant, branches) => {
    const defaultBranch = branches.find((b) => b.is_default) ?? branches[0] ?? null;
    set({
      tenant,
      branches,
      currentBranchId: get().currentBranchId ?? defaultBranch?.id ?? null,
    });
    await secureStorage.set(StorageKeys.TenantData, JSON.stringify({ tenant, branches }));
    if (defaultBranch) {
      await secureStorage.set(StorageKeys.BranchId, String(defaultBranch.id));
    }
  },

  setCurrentBranch: async (id) => {
    set({ currentBranchId: id });
    await secureStorage.set(StorageKeys.BranchId, String(id));
  },

  reset: async () => {
    set({ slug: null, tenant: null, branches: [], currentBranchId: null });
    setApiTenant(null);
    await Promise.all([
      secureStorage.remove(StorageKeys.TenantSlug),
      secureStorage.remove(StorageKeys.TenantData),
      secureStorage.remove(StorageKeys.BranchId),
    ]);
  },

  hydrate: async () => {
    const [slug, dataRaw, branchIdRaw] = await Promise.all([
      secureStorage.get(StorageKeys.TenantSlug),
      secureStorage.get(StorageKeys.TenantData),
      secureStorage.get(StorageKeys.BranchId),
    ]);
    if (slug) setApiTenant(slug);
    let tenant: Tenant | null = null;
    let branches: Branch[] = [];
    if (dataRaw) {
      try {
        const parsed = JSON.parse(dataRaw) as { tenant: Tenant; branches: Branch[] };
        tenant = parsed.tenant;
        branches = parsed.branches;
      } catch {
        // datos corruptos — ignorar
      }
    }
    set({
      slug,
      tenant,
      branches,
      currentBranchId: branchIdRaw ? Number(branchIdRaw) : null,
    });
  },
}));
