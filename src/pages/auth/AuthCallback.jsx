import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { checkSession } from '../../features/auth/authSlice';

export default function AuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const handleCallback = async () => {
      await dispatch(checkSession());
      navigate('/');
    };

    handleCallback();
  }, [dispatch, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Completing sign in...</div>
    </div>
  );
}
