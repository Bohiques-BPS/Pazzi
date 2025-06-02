
import React, { useState, ChangeEvent } from 'react';
import { Modal } from './Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../constants';
import { SparklesIcon, DocumentArrowUpIcon } from './icons'; // Added DocumentArrowUpIcon
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import * as XLSX from 'xlsx';

interface AIImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: (data: any[]) => void; // Expect an array now
    entityName: string;
    exampleFormat: string; // Example of ONE item in the expected array
    fieldsToExtract: string;
}

export const AIImportModal: React.FC<AIImportModalProps> = ({
    isOpen,
    onClose,
    onImportSuccess,
    entityName,
    exampleFormat,
    fieldsToExtract,
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setError(null); // Clear previous errors
        } else {
            setSelectedFile(null);
        }
    };

    const parseFileData = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    if (!data) {
                        reject(new Error("No data read from file."));
                        return;
                    }
                    let jsonData: any[] = [];
                    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                        const workbook = XLSX.read(data, { type: 'binary' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // header: 1 gives array of arrays
                        // Convert array of arrays to array of objects, assuming first row is header
                        if (jsonData.length > 0) {
                            const headers = jsonData[0] as string[];
                            jsonData = jsonData.slice(1).map(row => {
                                const rowData: any = {};
                                headers.forEach((header, index) => {
                                    rowData[header] = (row as any[])[index];
                                });
                                return rowData;
                            });
                        }

                    } else if (file.name.endsWith('.csv')) {
                        const text = data.toString();
                        const rows = text.split(/\r\n|\n/);
                        if (rows.length > 0) {
                            const headers = rows[0].split(',');
                            jsonData = rows.slice(1).map(rowStr => {
                                const values = rowStr.split(',');
                                const rowData: any = {};
                                headers.forEach((header, index) => {
                                    rowData[header.trim()] = values[index]?.trim();
                                });
                                return rowData;
                            }).filter(obj => Object.values(obj).some(val => val !== undefined && val !== '')); // Filter out empty rows
                        }
                    } else {
                        reject(new Error("Formato de archivo no soportado. Use .xlsx, .xls o .csv"));
                        return;
                    }
                    resolve(jsonData);
                } catch (err) {
                    console.error("Error parsing file:", err);
                    reject(new Error("Error al leer o parsear el archivo."));
                }
            };
            reader.onerror = (err) => reject(new Error("Error al leer el archivo."));
            
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                reader.readAsBinaryString(file);
            } else if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                 reject(new Error("Formato de archivo no soportado. Use .xlsx, .xls o .csv"));
            }
        });
    };


    const handleProcessWithAI = async () => {
        if (!selectedFile) {
            setError(`Por favor, seleccione un archivo para importar ${entityName.toLowerCase()}s.`);
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const parsedDataFromFile = await parseFileData(selectedFile);
            if (!parsedDataFromFile || parsedDataFromFile.length === 0) {
                setError("El archivo está vacío o no se pudo leer ningún dato.");
                setIsLoading(false);
                return;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const fileContentString = JSON.stringify(parsedDataFromFile, null, 2); // Send structured data as JSON string
            
            const prompt = `
                Analiza los siguientes datos tabulares (de un archivo Excel/CSV) para extraer una lista de ${entityName.toLowerCase()}s.
                Los campos a extraer son: ${fieldsToExtract}.
                Intenta mapear las columnas del archivo a estos campos. Por ejemplo, si una columna se llama "Nombre del Item" y esperas "nombre", haz el mapeo.
                Devuelve un array de objetos JSON. Cada objeto debe representar un ${entityName.toLowerCase()}.
                Si un campo específico no se encuentra en una fila o no se puede determinar, omítelo o usa un valor nulo/vacío apropiado para ese campo en ese objeto.
                Asegúrate de que los campos numéricos sean números y los arrays (si los hay) sean arrays de strings.
                
                Ejemplo de formato JSON para UN SOLO OBJETO DENTRO DEL ARRAY esperado:
                ${exampleFormat}

                Datos del archivo (representados como JSON):
                \`\`\`json
                ${fileContentString.substring(0, 3500)} 
                \`\`\`
                (Nota: Los datos del archivo pueden ser más extensos. Considera el patrón general.)
            `;

            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                }
            });
            
            let jsonStr = response.text.trim();
            const fenceRegex = /^```(\w*)?\s*\n?([\s\S]*?)\n?\s*```$/; // Changed (.*?) to ([\s\S]*?) and removed /s flag
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
                jsonStr = match[2].trim();
            }

            try {
                const parsedAIResponse = JSON.parse(jsonStr);
                if (Array.isArray(parsedAIResponse)) {
                    onImportSuccess(parsedAIResponse);
                    setSelectedFile(null); 
                    onClose();
                } else {
                    console.error("AI response was not an array:", parsedAIResponse);
                    setError("La IA no devolvió una lista de entidades. Por favor, revise el archivo o intente de nuevo.");
                }
            } catch (parseError) {
                console.error("Error parsing AI response:", parseError, "\nRaw response:", jsonStr);
                setError("La IA devolvió un formato de datos inesperado. Por favor, intente de nuevo o revise el archivo.");
            }

        } catch (apiOrFileError) {
            console.error("Error during AI import:", apiOrFileError);
            // Check if apiOrFileError is an instance of Error to access message property
            if (apiOrFileError instanceof Error) {
                 setError(`Error: ${apiOrFileError.message}`);
            } else {
                 setError("Ocurrió un error desconocido durante la importación.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalClose = () => {
        setSelectedFile(null);
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleModalClose} title={`Importar ${entityName}s con IA desde Archivo`} size="lg">
            <div className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv) que contenga la lista de {entityName.toLowerCase()}s.
                    La IA intentará extraer los campos: {fieldsToExtract}.
                </p>
                <div>
                    <label htmlFor="aiFileInput" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Archivo a importar:
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 dark:border-neutral-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500" />
                            <div className="flex text-sm text-neutral-600 dark:text-neutral-400">
                                <label
                                    htmlFor="aiFileInputField"
                                    className="relative cursor-pointer bg-white dark:bg-neutral-700 rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                                >
                                    <span>Subir un archivo</span>
                                    <input id="aiFileInputField" name="aiFileInputField" type="file" className="sr-only" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-500">XLSX, XLS, CSV hasta 10MB</p>
                        </div>
                    </div>
                    {selectedFile && (
                        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                            Archivo seleccionado: <span className="font-medium">{selectedFile.name}</span>
                        </p>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded-md">{error}</p>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={handleModalClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={isLoading}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleProcessWithAI}
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}
                        disabled={isLoading || !selectedFile}
                    >
                        <SparklesIcon className="mr-1.5" />
                        {isLoading ? `Procesando...` : `Procesar Archivo con IA`}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
