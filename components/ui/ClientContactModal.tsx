
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Client } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { PaperAirplaneIcon } from '../icons';
import { RichTextEditor } from './RichTextEditor';

interface ClientContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

export const ClientContactModal: React.FC<ClientContactModalProps> = ({ isOpen, onClose, client }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSend = () => {
        // Here you would integrate with an email service or internal notification system
        alert(`Mensaje enviado a ${client?.email}:\nAsunto: ${subject}\nMensaje: ${message}`);
        onClose();
    };

    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Contactar a ${client.name} ${client.lastName}`} size="md">
            <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-neutral-700 dark:text-neutral-200">
                    <p><strong>Email:</strong> {client.email}</p>
                    <p><strong>Teléfono:</strong> {client.phone}</p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1">Asunto</label>
                    <input 
                        type="text" 
                        className={inputFormStyle} 
                        value={subject} 
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ej: Recordatorio de Pago, Actualización de Proyecto..." 
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1">Mensaje</label>
                    <RichTextEditor 
                        value={message} 
                        onChange={setMessage} 
                        placeholder="Escriba su mensaje aquí..." 
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button onClick={handleSend} className={BUTTON_PRIMARY_SM_CLASSES}>
                        <PaperAirplaneIcon className="w-4 h-4 mr-2" /> Enviar Mensaje
                    </button>
                </div>
            </div>
        </Modal>
    );
};
