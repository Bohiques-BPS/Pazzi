
import React, { useEffect, useRef } from 'react';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../constants';

export interface TourStep {
    id: string;
    title: string;
    content: string;
    targetElementId: string;
    placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
    headerColorClass: string; // Tailwind background color class e.g., 'bg-blue-500'
    arrowClass?: string; // To position arrow, e.g., 'left-1/2 -translate-x-1/2 -bottom-2'
}

interface GuidedTourProps {
    steps: TourStep[];
    currentStepIndex: number;
    isOpen: boolean;
    onClose: () => void; // For finishing or skipping
    onNext: () => void;
    onPrev: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
    steps,
    currentStepIndex,
    isOpen,
    onClose,
    onNext,
    onPrev,
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const currentStep = steps[currentStepIndex];

    useEffect(() => {
        if (!isOpen || !currentStep) return;

        const targetElement = document.getElementById(currentStep.targetElementId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            
            // Add a temporary highlight class
            targetElement.classList.add('tour-highlight-active');
            targetElement.style.setProperty('position', 'relative', 'important'); // Ensure z-index works
            targetElement.style.setProperty('z-index', '51', 'important'); // Above overlay, below popover
            
            return () => {
                targetElement.classList.remove('tour-highlight-active');
                targetElement.style.removeProperty('position');
                targetElement.style.removeProperty('z-index');
            };
        }
    }, [currentStep, isOpen]);
    
    useEffect(() => { // Close on Escape key
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
              onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
           window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);


    if (!isOpen || !currentStep) return null;

    const getPopoverPosition = () => {
        const targetElement = document.getElementById(currentStep.targetElementId);
        if (!targetElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }; // Centered if target not found

        const rect = targetElement.getBoundingClientRect();
        const popoverHeight = popoverRef.current?.offsetHeight || 200;
        const popoverWidth = popoverRef.current?.offsetWidth || 320;
        const spacing = 15; // Space between target and popover

        let top = 0, left = 0;

        switch (currentStep.placement) {
            case 'top':
                top = rect.top - popoverHeight - spacing;
                left = rect.left + rect.width / 2 - popoverWidth / 2;
                break;
            case 'bottom':
                top = rect.bottom + spacing;
                left = rect.left + rect.width / 2 - popoverWidth / 2;
                break;
            case 'left':
                top = rect.top + rect.height / 2 - popoverHeight / 2;
                left = rect.left - popoverWidth - spacing;
                break;
            case 'right':
                top = rect.top + rect.height / 2 - popoverHeight / 2;
                left = rect.right + spacing;
                break;
            case 'center':
            default:
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' as const };
        }
        // Keep popover within viewport
        top = Math.max(spacing, Math.min(top, window.innerHeight - popoverHeight - spacing));
        left = Math.max(spacing, Math.min(left, window.innerWidth - popoverWidth - spacing));

        return { top: `${top}px`, left: `${left}px`, position: 'fixed' as const };
    };
    
    const getArrowClasses = () => {
        const base = "absolute w-3 h-3 bg-white dark:bg-neutral-800 transform rotate-45";
        switch (currentStep.placement) {
            case 'top': return `${base} left-1/2 -translate-x-1/2 -bottom-[6px] border-b border-r border-neutral-300 dark:border-neutral-600`;
            case 'bottom': return `${base} left-1/2 -translate-x-1/2 -top-[6px] border-t border-l border-neutral-300 dark:border-neutral-600`;
            case 'left': return `${base} top-1/2 -translate-y-1/2 -right-[6px] border-t border-r border-neutral-300 dark:border-neutral-600`;
            case 'right': return `${base} top-1/2 -translate-y-1/2 -left-[6px] border-b border-l border-neutral-300 dark:border-neutral-600`;
            default: return '';
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 z-40" onClick={onClose}></div>
            <style>{`
                .tour-highlight-active {
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 4px var(--tw-color-primary, #0D9488);
                    border-radius: 4px;
                    transition: box-shadow 0.3s ease-in-out;
                }
                 @media (prefers-color-scheme: dark) {
                    .tour-highlight-active {
                        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 0 4px var(--tw-color-primary, #0D9488);
                    }
                }
            `}</style>
            <div
                ref={popoverRef}
                style={getPopoverPosition()}
                className="w-80 sm:w-96 bg-white dark:bg-neutral-800 rounded-lg shadow-2xl z-50 flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-step-title"
                aria-describedby="tour-step-content"
            >
                {currentStep.placement !== 'center' && <div className={getArrowClasses()}></div>}
                <div className={`px-4 py-3 text-white font-semibold text-lg rounded-t-lg ${currentStep.headerColorClass}`} id="tour-step-title">
                    {currentStep.title}
                </div>
                <div className="p-4 text-sm text-neutral-700 dark:text-neutral-200" id="tour-step-content">
                    {currentStep.content}
                </div>
                <div className="flex justify-between items-center p-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Paso {currentStepIndex + 1} de {steps.length}
                    </div>
                    <div className="space-x-2">
                        {currentStepIndex > 0 ? (
                            <button onClick={onPrev} className={BUTTON_SECONDARY_SM_CLASSES}>
                                Anterior
                            </button>
                        ) : (
                            <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>
                                Saltar Tour
                            </button>
                        )}
                        {currentStepIndex < steps.length - 1 ? (
                            <button onClick={onNext} className={`${BUTTON_PRIMARY_SM_CLASSES}`}>
                                Siguiente
                            </button>
                        ) : (
                            <button onClick={onClose} className={`${BUTTON_PRIMARY_SM_CLASSES}`}>
                                Finalizar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

// Add default export if it's the only export, or make named if there will be others
export default GuidedTour;
