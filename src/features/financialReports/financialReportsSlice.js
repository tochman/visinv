import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FinancialReport } from '../../services/resources';

/**
 * Financial Reports Redux Slice
 * US-230: Balance Sheet (Balansräkning)
 * US-231: Income Statement (Resultaträkning)
 * US-233: VAT Report (Momsrapport)
 */

// Async thunks
export const fetchBalanceSheet = createAsyncThunk(
  'financialReports/fetchBalanceSheet',
  async ({ organizationId, asOfDate, comparativeDate, fiscalYearId }, { rejectWithValue }) => {
    const { data, error } = await FinancialReport.getBalanceSheet({
      organizationId,
      asOfDate,
      comparativeDate,
      fiscalYearId,
    });

    if (error) {
      return rejectWithValue(error.message);
    }

    return data;
  }
);

export const fetchIncomeStatement = createAsyncThunk(
  'financialReports/fetchIncomeStatement',
  async ({ organizationId, startDate, endDate, comparativeStartDate, comparativeEndDate, fiscalYearId }, { rejectWithValue }) => {
    const { data, error } = await FinancialReport.getIncomeStatement({
      organizationId,
      startDate,
      endDate,
      comparativeStartDate,
      comparativeEndDate,
      fiscalYearId,
    });

    if (error) {
      return rejectWithValue(error.message);
    }

    return data;
  }
);

export const fetchVatReport = createAsyncThunk(
  'financialReports/fetchVatReport',
  async ({ organizationId, startDate, endDate, fiscalYearId }, { rejectWithValue }) => {
    const { data, error } = await FinancialReport.getVatReport({
      organizationId,
      startDate,
      endDate,
      fiscalYearId,
    });

    if (error) {
      return rejectWithValue(error.message);
    }

    return data;
  }
);

// Initial state
const initialState = {
  balanceSheet: {
    data: null,
    loading: false,
    error: null,
    asOfDate: null,
    comparativeDate: null,
  },
  incomeStatement: {
    data: null,
    loading: false,
    error: null,
    startDate: null,
    endDate: null,
    comparativeStartDate: null,
    comparativeEndDate: null,
  },
  vatReport: {
    data: null,
    loading: false,
    error: null,
    startDate: null,
    endDate: null,
  },
};

// Slice
const financialReportsSlice = createSlice({
  name: 'financialReports',
  initialState,
  reducers: {
    clearBalanceSheet: (state) => {
      state.balanceSheet = initialState.balanceSheet;
    },
    clearIncomeStatement: (state) => {
      state.incomeStatement = initialState.incomeStatement;
    },
    clearVatReport: (state) => {
      state.vatReport = initialState.vatReport;
    },
    clearAllReports: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Balance Sheet
      .addCase(fetchBalanceSheet.pending, (state) => {
        state.balanceSheet.loading = true;
        state.balanceSheet.error = null;
      })
      .addCase(fetchBalanceSheet.fulfilled, (state, action) => {
        state.balanceSheet.loading = false;
        state.balanceSheet.data = action.payload;
        state.balanceSheet.asOfDate = action.meta.arg.asOfDate;
        state.balanceSheet.comparativeDate = action.meta.arg.comparativeDate || null;
      })
      .addCase(fetchBalanceSheet.rejected, (state, action) => {
        state.balanceSheet.loading = false;
        state.balanceSheet.error = action.payload || action.error.message;
      })
      // Income Statement
      .addCase(fetchIncomeStatement.pending, (state) => {
        state.incomeStatement.loading = true;
        state.incomeStatement.error = null;
      })
      .addCase(fetchIncomeStatement.fulfilled, (state, action) => {
        state.incomeStatement.loading = false;
        state.incomeStatement.data = action.payload;
        state.incomeStatement.startDate = action.meta.arg.startDate;
        state.incomeStatement.endDate = action.meta.arg.endDate;
        state.incomeStatement.comparativeStartDate = action.meta.arg.comparativeStartDate || null;
        state.incomeStatement.comparativeEndDate = action.meta.arg.comparativeEndDate || null;
      })
      .addCase(fetchIncomeStatement.rejected, (state, action) => {
        state.incomeStatement.loading = false;
        state.incomeStatement.error = action.payload || action.error.message;
      })
      // VAT Report
      .addCase(fetchVatReport.pending, (state) => {
        state.vatReport.loading = true;
        state.vatReport.error = null;
      })
      .addCase(fetchVatReport.fulfilled, (state, action) => {
        state.vatReport.loading = false;
        state.vatReport.data = action.payload;
        state.vatReport.startDate = action.meta.arg.startDate;
        state.vatReport.endDate = action.meta.arg.endDate;
      })
      .addCase(fetchVatReport.rejected, (state, action) => {
        state.vatReport.loading = false;
        state.vatReport.error = action.payload || action.error.message;
      });
  },
});

// Actions
export const { clearBalanceSheet, clearIncomeStatement, clearVatReport, clearAllReports } = financialReportsSlice.actions;

// Selectors
export const selectBalanceSheetData = (state) => state.financialReports.balanceSheet.data;
export const selectBalanceSheetLoading = (state) => state.financialReports.balanceSheet.loading;
export const selectBalanceSheetError = (state) => state.financialReports.balanceSheet.error;
export const selectBalanceSheetDates = (state) => ({
  asOfDate: state.financialReports.balanceSheet.asOfDate,
  comparativeDate: state.financialReports.balanceSheet.comparativeDate,
});

export const selectIncomeStatementData = (state) => state.financialReports.incomeStatement.data;
export const selectIncomeStatementLoading = (state) => state.financialReports.incomeStatement.loading;
export const selectIncomeStatementError = (state) => state.financialReports.incomeStatement.error;
export const selectIncomeStatementDates = (state) => ({
  startDate: state.financialReports.incomeStatement.startDate,
  endDate: state.financialReports.incomeStatement.endDate,
  comparativeStartDate: state.financialReports.incomeStatement.comparativeStartDate,
  comparativeEndDate: state.financialReports.incomeStatement.comparativeEndDate,
});

export const selectVatReportData = (state) => state.financialReports.vatReport.data;
export const selectVatReportLoading = (state) => state.financialReports.vatReport.loading;
export const selectVatReportError = (state) => state.financialReports.vatReport.error;
export const selectVatReportDates = (state) => ({
  startDate: state.financialReports.vatReport.startDate,
  endDate: state.financialReports.vatReport.endDate,
});

export default financialReportsSlice.reducer;
