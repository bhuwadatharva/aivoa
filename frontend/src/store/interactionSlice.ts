import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/interactions';
const AI_API_URL = 'http://localhost:8000/api/ai';

interface InteractionState {
  interactions: any[];
  meetingPrep: string | null;
  nextBestAction: any | null;
  currentExtractedData: any | null;
  complianceWarning: string | null;
  metadata: {
    products: any[];
    competitors: any[];
    materials: any[];
  };
  loading: boolean;
  error: string | null;
}

const initialState: InteractionState = {
  interactions: [],
  meetingPrep: null,
  nextBestAction: null,
  currentExtractedData: null,
  complianceWarning: null,
  metadata: {
    products: [],
    competitors: [],
    materials: []
  },
  loading: false,
  error: null
};

export const fetchInteractions = createAsyncThunk(
  'interaction/fetchAll',
  async (params: { hcp_id?: string; sentiment?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_URL, { params });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch interactions');
    }
  }
);

export const createInteraction = createAsyncThunk(
  'interaction/create',
  async (interactionData: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(API_URL, interactionData);
      dispatch(fetchInteractions({ hcp_id: interactionData.hcp_id }));
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create interaction');
    }
  }
);

export const deleteInteraction = createAsyncThunk(
  'interaction/delete',
  async (params: { id: string; hcp_id?: string }, { rejectWithValue, dispatch }) => {
    try {
      await axios.delete(`${API_URL}/${params.id}`);
      dispatch(fetchInteractions({ hcp_id: params.hcp_id }));
      return params.id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete interaction');
    }
  }
);

export const fetchMeetingPrep = createAsyncThunk(
  'interaction/meetingPrep',
  async (hcpId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${AI_API_URL}/meeting-prep`, {
        params: { hcp_id: hcpId }
      });
      return response.data.briefing_markdown;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch meeting prep briefing');
    }
  }
);

export const fetchNextBestAction = createAsyncThunk(
  'interaction/nextBestAction',
  async (hcpId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${AI_API_URL}/next-action`, {
        params: { hcp_id: hcpId }
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch next best action');
    }
  }
);

export const fetchMetadata = createAsyncThunk(
  'interaction/fetchMetadata',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/metadata`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch metadata');
    }
  }
);

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    setExtractedData(state, action) {
      state.currentExtractedData = action.payload;
    },
    setComplianceWarning(state, action) {
      state.complianceWarning = action.payload;
    },
    clearInteractionStatus(state) {
      state.meetingPrep = null;
      state.nextBestAction = null;
      state.currentExtractedData = null;
      state.complianceWarning = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch interactions
      .addCase(fetchInteractions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create interaction
      .addCase(createInteraction.pending, (state) => {
        state.loading = true;
      })
      .addCase(createInteraction.fulfilled, (state) => {
        state.loading = false;
        state.currentExtractedData = null;
        state.complianceWarning = null;
      })
      .addCase(createInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Meeting prep
      .addCase(fetchMeetingPrep.fulfilled, (state, action) => {
        state.meetingPrep = action.payload;
      })
      // Next best action
      .addCase(fetchNextBestAction.fulfilled, (state, action) => {
        state.nextBestAction = action.payload;
      })
      // Fetch metadata
      .addCase(fetchMetadata.fulfilled, (state, action) => {
        state.metadata = action.payload;
      });
  },
});

export const { setExtractedData, setComplianceWarning, clearInteractionStatus } = interactionSlice.actions;
export default interactionSlice.reducer;
