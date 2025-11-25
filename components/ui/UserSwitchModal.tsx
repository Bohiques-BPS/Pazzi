import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { User } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { UserCircleIcon, KeyIcon, ArrowUturnLeftIcon } from '../icons';

interface UserSwitchModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: User[];
    onSwitchUser: (employee: User, pass: string) => Promise<boolean>;
    onSwitchUserWithPin: (userId: string, pin: string) => Promise<boolean>;
}

export const UserSwitchModal: React.FC<UserSwitchModalProps> = ({ isOpen, onClose, employees, onSwitchUser, onSwitchUserWithPin }) => {
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');

    useEffect(() => {
        if (!isOpen) {
            setSelectedEmployee(null);
            setPassword('');
            setPin('');
            setError(null);
            setLoginMethod('password');
        }
    }, [isOpen]);

    const handleUserSelect = (employee: User) => {
        setSelectedEmployee(employee);
        setError(null);
        setPassword('');
        setPin('');
        // Prefer PIN if user has one
        if (employee.pin) {
            setLoginMethod('pin');
        } else {
            setLoginMethod('password');
        }
    };

    const handleLoginAttempt = async () => {
        if (!selectedEmployee) return;
        
        let success = false;
        if (loginMethod === 'pin') {
            if (!pin) return;
            success = await onSwitchUserWithPin(selectedEmployee.id, pin);
            if (!success) {
                setError('PIN incorrecto. Intente de nuevo.');
                setPin('');
            }
        } else {
            if (!password) return;
            success = await onSwitchUser(selectedEmployee, password);
            if (!success) {
                setError('Contraseña incorrecta. Intente de nuevo.');
                setPassword('');
            }
        }
        
        if (success) {
            onClose();
        }
    };
    
    const handleBack = () => {
        setSelectedEmployee(null);
        setError(null);
        setPassword('');
        setPin('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={selectedEmployee ? `Ingresar como ${selectedEmployee.name}` : "Cambiar de Usuario"} size="2xl">
            {!selectedEmployee ? (
                // User Selection View
                <div>
                    <h3 className="text-center text-2xl font-medium text-neutral-700 dark:text-neutral-200 mb-8">Seleccione un usuario para iniciar sesión</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 max-h-[60vh] overflow-y-auto p-4">
                        {employees.map(emp => (
                            <button 
                                key={emp.id} 
                                onClick={() => handleUserSelect(emp)}
                                className="flex flex-col items-center p-4 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {emp.profilePictureUrl ? (
                                    <img src={emp.profilePictureUrl} alt={emp.name} className="w-32 h-32 rounded-full object-cover mb-3" />
                                ) : (
                                    <UserCircleIcon className="w-32 h-32 text-neutral-400 mb-3" />
                                )}
                                <span className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 text-center">{emp.name} {emp.lastName}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                // Password/PIN Entry View
                <div className="flex flex-col items-center">
                    {selectedEmployee.profilePictureUrl ? (
                        <img src={selectedEmployee.profilePictureUrl} alt={selectedEmployee.name} className="w-28 h-28 rounded-full object-cover mb-3" />
                    ) : (
                        <UserCircleIcon className="w-28 h-28 text-neutral-400 mb-3" />
                    )}
                    <h3 className="text-2xl font-semibold">{selectedEmployee.name} {selectedEmployee.lastName}</h3>
                    <p className="text-lg text-neutral-500 mb-6">{selectedEmployee.role}</p>

                    <div className="w-full max-w-sm mb-4">
                        <div className="flex border-b border-gray-300 dark:border-gray-600">
                            {selectedEmployee.pin && (
                                <button
                                    onClick={() => setLoginMethod('pin')}
                                    className={`flex-1 py-2 text-center font-medium ${loginMethod === 'pin' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                                >
                                    Ingresar con PIN
                                </button>
                            )}
                            <button
                                onClick={() => setLoginMethod('password')}
                                className={`flex-1 py-2 text-center font-medium ${loginMethod === 'password' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                            >
                                Ingresar con Contraseña
                            </button>
                        </div>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleLoginAttempt(); }} className="w-full max-w-sm space-y-4">
                        <div className="relative">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <KeyIcon className="w-5 h-5 text-neutral-400" />
                            </span>
                            {loginMethod === 'password' ? (
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={inputFormStyle + " pl-10 !text-lg"}
                                    placeholder="Contraseña"
                                    autoFocus
                                />
                            ) : (
                                <input
                                    type="password" // Use password type to obscure PIN
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className={inputFormStyle + " pl-10 !text-lg tracking-[1em] text-center"}
                                    placeholder="----"
                                    maxLength={4}
                                    inputMode="numeric"
                                    pattern="\d{4}"
                                    autoFocus
                                />
                            )}
                        </div>
                        {error && <p className="text-sm text-center text-red-500">{error}</p>}
                        
                        <button type="submit" className={BUTTON_PRIMARY_CLASSES + " w-full !text-lg"}>Ingresar</button>
                         <button 
                            type="button" 
                            onClick={handleBack} 
                            className={`${BUTTON_SECONDARY_SM_CLASSES} w-full flex items-center justify-center !text-base`}
                        >
                            <ArrowUturnLeftIcon className="w-4 h-4 mr-1.5" />
                            Volver a la lista
                        </button>
                    </form>
                </div>
            )}
        </Modal>
    );
};