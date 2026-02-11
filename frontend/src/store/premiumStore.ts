import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getPremiumInfo, createInvoice, PremiumInfo, PremiumFeature } from '@/api/payments';

interface PremiumState {
  // Данные
  isPremium: boolean;
  premiumUntil: string | null;
  daysRemaining: number | null;
  price: number;
  duration: number;
  features: PremiumFeature[];
  
  // Loading
  isLoading: boolean;
  isCreatingInvoice: boolean;
  error: string | null;
  
  // Actions
  fetchPremiumInfo: () => Promise<void>;
  purchasePremium: () => Promise<string | null>;
  setPremiumStatus: (isPremium: boolean, premiumUntil?: string | null) => void;
}

export const usePremiumStore = create<PremiumState>()(
  devtools(
    (set, get) => ({
      isPremium: false,
      premiumUntil: null,
      daysRemaining: null,
      price: 100,
      duration: 30,
      features: [],
      isLoading: false,
      isCreatingInvoice: false,
      error: null,

      fetchPremiumInfo: async () => {
        set({ isLoading: true, error: null });

        try {
          const info = await getPremiumInfo();
          set({
            isPremium: info.isPremium,
            premiumUntil: info.premiumUntil,
            daysRemaining: info.daysRemaining,
            price: info.price,
            duration: info.duration,
            features: info.features,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch premium info';
          set({ error: message, isLoading: false });
        }
      },

      purchasePremium: async () => {
        set({ isCreatingInvoice: true, error: null });

        try {
          const response = await createInvoice();

          set({ isCreatingInvoice: false });

          // Если уже Premium
          if (response.alreadyPremium) {
            set({
              isPremium: true,
              premiumUntil: response.premiumUntil || null,
              daysRemaining: response.daysRemaining || null,
            });
            return null;
          }

          // Возвращаем ссылку на инвойс
          return response.invoiceLink || null;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create invoice';
          set({ error: message, isCreatingInvoice: false });
          return null;
        }
      },

      setPremiumStatus: (isPremium, premiumUntil = null) => {
        set({ isPremium, premiumUntil });
      },
    }),
    { name: 'PremiumStore' }
  )
);
