import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/hcps';

interface HCP {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  email: string;
  phone?: string;
  relationship_score: number;
  interest_score: number;
  prescription_likelihood: string;
  created_at: string;
  updated_at: string;
}

interface HCPFilters {
  search: string;
  specialty: string;
  sortBy: string;
  order: string;
}

interface HCPState {
  hcps: HCP[];
  selectedHCP: HCP | null;
  insights: any | null;
  loading: boolean;
  error: string | null;
  filters: HCPFilters;
}

const initialState: HCPState = {
  hcps: [],
  selectedHCP: null,
  insights: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    specialty: '',
    sortBy: 'name',
    order: 'asc'
  }
};

export const fetchHCPs = createAsyncThunk(
  'hcp/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const { hcp } = getState() as { hcp: HCPState };
    const { search, specialty, sortBy, order } = hcp.filters;
    
    try {
      const response = await axios.get(API_URL, {
        params: {
          search: search || undefined,
          specialty: specialty || undefined,
          sort_by: sortBy,
          order
        }
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch HCPs');
    }
  }
);

export const fetchHCPDetails = createAsyncThunk(
  'hcp/fetchDetails',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch HCP details');
    }
  }
);

export const fetchHCPInsights = createAsyncThunk(
  'hcp/fetchInsights',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/${id}/insights`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch insights');
    }
  }
);

export const createHCP = createAsyncThunk(
  'hcp/create',
  async (hcpData: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(API_URL, hcpData);
      dispatch(fetchHCPs());
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create HCP');
    }
  }
);

export const deleteHCP = createAsyncThunk(
  'hcp/delete',
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      dispatch(fetchHCPs());
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete HCP');
    }
  }
);

const hcpSlice = createSlice({
  name: 'hcp',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
    resetSelectedHCP(state) {
      state.selectedHCP = null;
      state.insights = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchHCPs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHCPs.fulfilled, (state, action) => {
        state.loading = false;
        state.hcps = action.payload;
      })
      .addCase(fetchHCPs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Details
      .addCase(fetchHCPDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHCPDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedHCP = action.payload;
      })
      .addCase(fetchHCPDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Insights
      .addCase(fetchHCPInsights.fulfilled, (state, action) => {
        state.insights = action.payload;
      });
  },
});

export const { setFilters, resetFilters, resetSelectedHCP } = hcpSlice.actions;
export default hcpSlice.reducer;
