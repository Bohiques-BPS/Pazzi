
import React, { useState } from 'react';
import { Modal } from './Modal';
import { UserCircleIcon, MicrophoneIcon, MicrophoneSlashIcon, VideoCameraIcon, VideoCameraSlashIcon, PhoneXMarkIcon } from './icons';
import { BUTTON_SECONDARY_SM_CLASSES } from '../constants';

interface CallModalProps {
    isOpen: boolean;
    onClose: () => void;
    callType: 'video' | 'audio';
    participants: string[]; // Array of participant names
}

export const CallModal: React.FC<CallModalProps> = ({ isOpen, onClose, callType, participants }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === 'audio'); // Video starts off for audio calls

    const handleToggleMute = () => {
        setIsMuted(!isMuted);
        console.log(isMuted ? "Mic unmuted (simulated)" : "Mic muted (simulated)");
    };

    const handleToggleVideo = () => {
        if (callType === 'video') {
            setIsVideoOff(!isVideoOff);
            console.log(isVideoOff ? "Video started (simulated)" : "Video stopped (simulated)");
        }
    };

    const handleEndCall = () => {
        console.log("Call ended (simulated)");
        onClose();
    };

    const participantDisplay = participants.join(', ');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${callType === 'video' ? 'Video' : 'Audio'} Call`} size="xl">
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-2">
                    En llamada con: {participantDisplay || "Participantes..."}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                    {callType === 'video' ? (isVideoOff ? 'Cámara apagada' : 'Cámara encendida') : 'Llamada de solo audio'}
                    {isMuted && ', Micrófono silenciado'}
                </p>

                {/* Placeholder for video feeds / avatars */}
                <div className={`grid ${callType === 'video' && !isVideoOff && participants.length > 0 ? (participants.length === 1 ? 'grid-cols-1' : 'grid-cols-2') : 'grid-cols-1'} gap-4 w-full max-w-lg mb-8`}>
                    {(callType === 'video' && !isVideoOff ? participants.slice(0,4) : [participants[0] || "Tú"]).map((name, index) => (
                         <div key={index} className="aspect-video bg-neutral-200 dark:bg-neutral-700 rounded-lg flex flex-col items-center justify-center p-4">
                            {callType === 'audio' || isVideoOff ? (
                                <>
                                    <UserCircleIcon />
                                    <span className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{name}</span>
                                </>
                            ) : (
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">Video de {name}</span>
                            )}
                        </div>
                    ))}
                     {callType === 'video' && !isVideoOff && participants.length === 0 && (
                         <div className="aspect-video bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                             <span className="text-sm text-neutral-500 dark:text-neutral-400">Esperando participantes...</span>
                         </div>
                     )}
                </div>
                
                {/* Call Controls */}
                <div className="flex space-x-4">
                    <button
                        onClick={handleToggleMute}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} !rounded-full !p-3 ${isMuted ? 'bg-red-100 dark:bg-red-700/50 text-red-600 dark:text-red-300' : ''}`}
                        aria-label={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
                    >
                        {isMuted ? <MicrophoneSlashIcon /> : <MicrophoneIcon />}
                    </button>

                    {callType === 'video' && (
                        <button
                            onClick={handleToggleVideo}
                            className={`${BUTTON_SECONDARY_SM_CLASSES} !rounded-full !p-3 ${isVideoOff ? 'bg-red-100 dark:bg-red-700/50 text-red-600 dark:text-red-300' : ''}`}
                            aria-label={isVideoOff ? "Iniciar video" : "Detener video"}
                        >
                            {isVideoOff ? <VideoCameraSlashIcon /> : <VideoCameraIcon />}
                        </button>
                    )}

                    <button
                        onClick={handleEndCall}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-full !p-3"
                        aria-label="Finalizar llamada"
                    >
                        <PhoneXMarkIcon />
                    </button>
                </div>
            </div>
        </Modal>
    );
};
