import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Mail, AlertCircle, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import logo from '/images/Logo.png'; // Tell webpack this JS file uses this image

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'accessCode'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, loginWithAccessCode } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Datos no validos , vuelva a intentar.');
      setIsLoading(false);
    }
  };

  const handleAccessCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await loginWithAccessCode(accessCode);
      navigate('/');
    } catch (err) {
      setError('Invalid access code. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#242E3D] flex flex-col items-center justify-center p-4">
      <img src={logo} alt="Logo" />
      <div className="max-w-md mt-8 w-full bg-white rounded-lg shadow-xl overflow-hidden">
      
        
        <div className="p-6">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex-1 py-3 font-medium text-center border-b-2 ${
                activeTab === 'credentials'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('credentials')}
            >
              Login
            </button>
            <button
              className={`flex-1 py-3 font-medium text-center border-b-2 ${
                activeTab === 'accessCode'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('accessCode')}
            >
              Cliente
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span>{error}</span>
            </div>
          )}
          
          {activeTab === 'credentials' ? (
            <form onSubmit={handleCredentialsLogin}>
              <Input
                label="Email"
                type="text"
                placeholder="Ingresa tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={18} />}
                fullWidth
                required
              />
              
              <Input
                label="Contraseña"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock size={18} />}
                fullWidth
                required
              />
              
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Recordar contraseña
                  </label>
                </div>
                <a href="/forgot-password" className="text-sm text-teal-600 hover:text-teal-500">
¿Haz olvidado tu contraseña?                </a>
              </div>
              
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
               
              >
                Iniciar sesión
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAccessCodeLogin}>
              <Input
                label="Access Code"
                type="text"
                placeholder="Enter your access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                leftIcon={<KeyRound size={18} />}
                helperText="Enter the access code provided by your administrator"
                fullWidth
                required
              />
              
              <div className="mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isLoading}
                  leftIcon={<User size={18} />}
                >
                  Sign In as Employee
                </Button>
              </div>
            </form>
          )}
          
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Test credentials (admin): admin / admin</p>
            <p>Test access code (employee): 123456</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;