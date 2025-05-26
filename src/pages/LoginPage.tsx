import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Mail, AlertCircle, Lock, UserPlus } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import logo from '/images/Logo.png';

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [registerType, setRegisterType] = useState<'client' | 'employee'>('client');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    contactNumber: '',
    specialization: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, loginWithAccessCode } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError('Datos no validos, vuelva a intentar.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Here you would implement the registration logic
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Register:', { ...formData, type: registerType });
      setIsLoading(false);
      setActiveTab('login');
    } catch (err) {
      setError('Error en el registro. Por favor, intente nuevamente.');
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
                activeTab === 'login'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('login')}
            >
              Iniciar Sesión
            </button>
            <button
              className={`flex-1 py-3 font-medium text-center border-b-2 ${
                activeTab === 'register'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('register')}
            >
              Registrarse
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span>{error}</span>
            </div>
          )}
          
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin}>
              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="Ingresa tu email"
                value={formData.email}
                onChange={handleInputChange}
                leftIcon={<Mail size={18} />}
                fullWidth
                required
              />
              
              <Input
                label="Contraseña"
                type="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                value={formData.password}
                onChange={handleInputChange}
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
                  ¿Olvidaste tu contraseña?
                </a>
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
            <form onSubmit={handleRegister}>
              <div className="mb-6">
                <div className="flex gap-4">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-md ${
                      registerType === 'client'
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => setRegisterType('client')}
                  >
                    Cliente
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-md ${
                      registerType === 'employee'
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => setRegisterType('employee')}
                  >
                    Empleado
                  </button>
                </div>
              </div>

              <Input
                label="Nombre Completo"
                type="text"
                name="name"
                placeholder="Ingresa tu nombre completo"
                value={formData.name}
                onChange={handleInputChange}
                leftIcon={<User size={18} />}
                fullWidth
                required
              />

              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="Ingresa tu email"
                value={formData.email}
                onChange={handleInputChange}
                leftIcon={<Mail size={18} />}
                fullWidth
                required
              />

              <Input
                label="Contraseña"
                type="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                value={formData.password}
                onChange={handleInputChange}
                leftIcon={<Lock size={18} />}
                fullWidth
                required
              />

              <Input
                label="Teléfono"
                type="tel"
                name="contactNumber"
                placeholder="Ingresa tu número de teléfono"
                value={formData.contactNumber}
                onChange={handleInputChange}
                fullWidth
                required
              />

              {registerType === 'employee' && (
                <Input
                  label="Especialización"
                  type="text"
                  name="specialization"
                  placeholder="Ingresa tu especialización"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                leftIcon={<UserPlus size={18} />}
              >
                Registrarse
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;