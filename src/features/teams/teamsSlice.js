import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabase';

export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (userId, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, team:teams(*)')
      .eq('user_id', userId);
    
    if (error) return rejectWithValue(error.message);
    return data.map(tm => tm.team);
  }
);

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async ({ teamData, userId }, { rejectWithValue }) => {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert(teamData)
      .select()
      .single();
    
    if (teamError) return rejectWithValue(teamError.message);
    
    // Add creator as owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'owner',
      });
    
    if (memberError) return rejectWithValue(memberError.message);
    return team;
  }
);

export const inviteTeamMember = createAsyncThunk(
  'teams/inviteTeamMember',
  async ({ teamId, email, role }, { rejectWithValue }) => {
    // This would typically send an invitation email
    // For now, we'll just create a pending member record
    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
      })
      .select()
      .single();
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const teamsSlice = createSlice({
  name: 'teams',
  initialState: {
    items: [],
    currentTeam: null,
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentTeam: (state, action) => {
      state.currentTeam = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { setCurrentTeam, clearError } = teamsSlice.actions;
export default teamsSlice.reducer;
