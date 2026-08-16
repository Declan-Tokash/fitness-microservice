import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    userId: localStorage.getItem('userId') || null,
  },
  reducers: {
    setCredentials: (state, action) => {
        const { user, token } = action.payload;
        state.user = user;
        state.token = token;
        state.userId = user.sub;
    
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        localStorage.setItem('userId', user.sub);

    },
    logout: (state) => {
        state.user = null;
        state.token = null;
        state.userId = null;

        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;