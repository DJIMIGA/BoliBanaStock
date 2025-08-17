import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { saleService } from '../../services/api';
import { Sale, CreateSaleRequest, SaleFilters } from '../../types';

interface SaleState {
  sales: Sale[];
  selectedSale: Sale | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  filters: SaleFilters;
}

const initialState: SaleState = {
  sales: [],
  selectedSale: null,
  loading: false,
  error: null,
  totalCount: 0,
  filters: {},
};

// Async thunks
export const fetchSales = createAsyncThunk(
  'sales/fetchSales',
  async (params: SaleFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await saleService.getSales(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement des ventes');
    }
  }
);

export const fetchSale = createAsyncThunk(
  'sales/fetchSale',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await saleService.getSale(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement de la vente');
    }
  }
);

export const createSale = createAsyncThunk(
  'sales/createSale',
  async (saleData: CreateSaleRequest, { rejectWithValue }) => {
    try {
      const response = await saleService.createSale(saleData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la création de la vente');
    }
  }
);

const saleSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<SaleFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSelectedSale: (state, action: PayloadAction<Sale | null>) => {
      state.selectedSale = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sales
      .addCase(fetchSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.loading = false;
        state.sales = action.payload.results;
        state.totalCount = action.payload.count;
      })
      .addCase(fetchSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch single sale
      .addCase(fetchSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSale.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSale = action.payload;
      })
      .addCase(fetchSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create sale
      .addCase(createSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.loading = false;
        state.sales.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearFilters, setSelectedSale } = saleSlice.actions;
export default saleSlice.reducer; 