import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { NpsResponse } from '../../services/resources/NpsResponse';

/**
 * Check if user is eligible to see NPS survey
 */
export const checkNpsEligibility = createAsyncThunk(
  'nps/checkEligibility',
  async (triggerContext, { rejectWithValue }) => {
    const { eligible, reason, error } = await NpsResponse.checkEligibility();
    
    if (error) {
      return rejectWithValue(error.message);
    }
    
    return { eligible, reason, triggerContext };
  }
);

/**
 * Record that NPS survey was shown
 */
export const recordNpsShown = createAsyncThunk(
  'nps/recordShown',
  async (triggerContext, { rejectWithValue }) => {
    const { data, error } = await NpsResponse.recordShown(triggerContext);
    
    if (error) {
      return rejectWithValue(error.message);
    }
    
    return data;
  }
);

/**
 * Submit NPS response
 */
export const submitNpsResponse = createAsyncThunk(
  'nps/submitResponse',
  async ({ responseId, score, feedback }, { rejectWithValue }) => {
    const { data, error } = await NpsResponse.submitResponse(responseId, score, feedback);
    
    if (error) {
      return rejectWithValue(error.message);
    }
    
    return data;
  }
);

/**
 * Dismiss NPS survey without responding
 */
export const dismissNpsSurvey = createAsyncThunk(
  'nps/dismiss',
  async (responseId, { rejectWithValue }) => {
    const { data, error } = await NpsResponse.dismiss(responseId);
    
    if (error) {
      return rejectWithValue(error.message);
    }
    
    return data;
  }
);

const initialState = {
  showModal: false,
  currentResponseId: null,
  triggerContext: null,
  selectedScore: null,
  feedback: '',
  loading: false,
  error: null,
  submitSuccess: false,
};

const npsSlice = createSlice({
  name: 'nps',
  initialState,
  reducers: {
    resetNpsState: (state) => {
      state.showModal = false;
      state.currentResponseId = null;
      state.triggerContext = null;
      state.selectedScore = null;
      state.feedback = '';
      state.loading = false;
      state.error = null;
      state.submitSuccess = false;
    },
    setSelectedScore: (state, action) => {
      state.selectedScore = action.payload;
    },
    setFeedback: (state, action) => {
      state.feedback = action.payload;
    },
    closeNpsModal: (state) => {
      state.showModal = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check eligibility
      .addCase(checkNpsEligibility.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkNpsEligibility.fulfilled, (state, action) => {
        state.loading = false;
        // Don't automatically show modal here - let the caller decide
        if (!action.payload.eligible) {
          state.showModal = false;
        }
      })
      .addCase(checkNpsEligibility.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.showModal = false;
      })
      
      // Record shown
      .addCase(recordNpsShown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recordNpsShown.fulfilled, (state, action) => {
        state.loading = false;
        state.showModal = true;
        state.currentResponseId = action.payload.id;
        state.triggerContext = action.payload.trigger_context;
      })
      .addCase(recordNpsShown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.showModal = false;
      })
      
      // Submit response
      .addCase(submitNpsResponse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitNpsResponse.fulfilled, (state) => {
        state.loading = false;
        state.submitSuccess = true;
        state.showModal = false;
        // Reset after short delay
        setTimeout(() => {
          state.submitSuccess = false;
          state.selectedScore = null;
          state.feedback = '';
          state.currentResponseId = null;
        }, 1000);
      })
      .addCase(submitNpsResponse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Dismiss survey
      .addCase(dismissNpsSurvey.fulfilled, (state) => {
        state.showModal = false;
        state.currentResponseId = null;
        state.selectedScore = null;
        state.feedback = '';
      });
  },
});

export const {
  resetNpsState,
  setSelectedScore,
  setFeedback,
  closeNpsModal,
} = npsSlice.actions;

export default npsSlice.reducer;
