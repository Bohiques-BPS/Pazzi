import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import logo from '/images/Logo.png';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err) {
      setError('Error al enviar el correo. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#242E3D] flex flex-col items-center justify-center p-4">
      <img src={logo} alt="Logo" />
      <div className="max-w-md mt-8 w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver al login
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Recuperar contraseña
          </h2>
          
          {success ? (
            <div className="text-center">
              <div className="mb-4 p-3 bg-teal-50 text-teal-800 rounded-md">
                Se ha enviado un correo con las instrucciones para restablecer tu contraseña.
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                fullWidth
              >
                Volver al login
              </Button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <Input
                  label="Email"
                  type="email"
                  placeholder="Ingresa tu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={18} />}
                  fullWidth
                  required
                />

                <div className="mt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Enviar instrucciones
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;