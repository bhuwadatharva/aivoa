import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { setExtractedData, setComplianceWarning } from "./interactionSlice";

interface Message {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  tool_triggered?: string;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [
    {
      role: "assistant",
      content:
        "Hello! I am your Aivoa AI CRM Assistant. Speak or type details about your HCP meetings and I will auto-fill your log form. You can also ask me for 'meeting prep briefings' or compliance details.",
    },
  ],
  loading: false,
  error: null,
};

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (
    chatInput: {
      message: string;
      hcp_id?: string | null;
      context_form_data?: any | null;
    },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const response = await axios.post(
        "https://aivoa-an49.onrender.com/api/ai/chat",
        chatInput,
      );
      const data = response.data;

      // Sync extracted form data to the interaction slice if tool parsed successfully
      if (data.extracted_data) {
        const payload = { ...data.extracted_data };
        if (payload.interaction && data.tool_output?.interaction_id) {
          payload.interaction = {
            ...payload.interaction,
            id: data.tool_output.interaction_id,
          };
        }
        dispatch(setExtractedData(payload));
      }

      // Sync compliance warning banner state
      if (data.compliance_warning) {
        dispatch(setComplianceWarning(data.compliance_warning));
      } else {
        dispatch(setComplianceWarning(null));
      }

      return {
        message: data.message,
        tool_triggered: data.tool_triggered || null,
      };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to communicate with AI",
      );
    }
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    clearChat(state) {
      state.messages = initialState.messages;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({
          role: "assistant",
          content: action.payload.message,
          tool_triggered: action.payload.tool_triggered,
        });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.messages.push({
          role: "assistant",
          content: `Sorry, I hit an error: ${action.payload}`,
        });
      });
  },
});

export const { addMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
