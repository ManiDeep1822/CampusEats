import { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, logout } from '../store/authSlice';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          dispatch(setCredentials({ user: data, token, role: data.role }));
        } catch (error) {
          console.error('Failed to fetch user', error);
          dispatch(logout());
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token, dispatch]);

  return (
    <AuthContext.Provider value={{ loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
