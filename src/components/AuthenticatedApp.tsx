import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Theme,
  Templates,
  SpecialtyBase,
  GroundingMetadata,
  SpeechRecognition, 
  SpeechRecognitionEvent, 
  SpeechRecognitionErrorEvent,
  HistoricNote,
  ActiveView
} from '../types';
import { DEFAULT_SPECIALTIES, DEFAULT_TEMPLATES, MEDICAL_SCALES } from '../lib/constants';
import { useDarkMode } from '../hooks/useDarkMode';
import { 
  getStoredTemplates, 
  saveTemplates as saveTemplatesToStorage,
  getStoredHistoricNotes,
  addHistoricNoteEntry,
  getUserStoredTemplates,
  saveUserTemplates,
  getUserStoredHistoricNotes,
  addUserHistoricNoteEntry
} from '../lib/services/storageService';
import { generateNoteFromTemplate, generateAISuggestions, generateMedicalScale } from '../lib/services/geminiService';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './ui/Sidebar';
import SpecialtySelector from './notes/SpecialtySelector';
import TemplateEditor from './notes/TemplateEditor';
import NoteDisplay from './notes/NoteDisplay';
import HistoryView from './HistoryView';
import UserProfile from './auth/UserProfile';
import { SparklesIcon, LoadingSpinner, LightBulbIcon, MicrophoneIcon, CalculatorIcon } from './ui/Icons';


const AuthenticatedApp: React.FC = () => {
  // SpeechRecognition API compatibility: Use window types which are now augmented by types.ts
  const SpeechRecognitionAPI = typeof window !== 'undefined' 
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const { user } = useAuth();
  const [theme, toggleTheme] = useDarkMode();
  const [activeView, setActiveView] = useState<ActiveView>('generate');
  const [specialties] = useState<SpecialtyBase[]>(DEFAULT_SPECIALTIES);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>(DEFAULT_SPECIALTIES[0].id);
  const [templates, setTemplates] = useState<Templates>({});
  const [historicNotes, setHistoricNotes] = useState<HistoricNote[]>([]);

  const [patientInfo, setPatientInfo] = useState<string>('');
  const [generatedTemplateNote, setGeneratedTemplateNote] = useState<string>('');
  const [templateNoteGrounding, setTemplateNoteGrounding] = useState<GroundingMetadata | undefined>(undefined);
  const [isGeneratingTemplateNote, setIsGeneratingTemplateNote] = useState<boolean>(false);

  const [aiSuggestionInput, setAiSuggestionInput] = useState<string>('');
  const [generatedAISuggestion, setGeneratedAISuggestion] = useState<string>('');
  const [aiSuggestionGrounding, setAiSuggestionGrounding] = useState<GroundingMetadata | undefined>(undefined);
  const [isGeneratingAISuggestion, setIsGeneratingAISuggestion] = useState<boolean>(false);

  const [selectedScale, setSelectedScale] = useState<string>(MEDICAL_SCALES[0].id);
  const [generatedScale, setGeneratedScale] = useState<string>('');
  const [scaleGrounding, setScaleGrounding] = useState<GroundingMetadata | undefined>(undefined);
  const [isGeneratingScale, setIsGeneratingScale] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);

  // Speech Recognition State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSpeechApiAvailable, setIsSpeechApiAvailable] = useState<boolean>(false);
  const speechRecognitionInstance = useRef<SpeechRecognition | null>(null);


  useEffect(() => {
    if (!user) return;

    // Load user-specific historic notes
    setHistoricNotes(getUserStoredHistoricNotes(user.id));

    // Load user-specific templates
    const currentStoredTemplates = getUserStoredTemplates(user.id);
    let updated = false;
    const newTemplates = {...currentStoredTemplates};
    DEFAULT_SPECIALTIES.forEach(spec => {
        if (!newTemplates[spec.id]) {
            newTemplates[spec.id] = DEFAULT_TEMPLATES[spec.id] || "PLANTILLA VACÍA PARA " + spec.name.toUpperCase();
            updated = true;
        }
    });
    if(updated) {
        setTemplates(newTemplates);
        saveUserTemplates(user.id, newTemplates);
    } else {
        setTemplates(currentStoredTemplates);
    }

    // Initialize Speech Recognition
    if (SpeechRecognitionAPI) {
      setIsSpeechApiAvailable(true);
      speechRecognitionInstance.current = new SpeechRecognitionAPI();
      speechRecognitionInstance.current.continuous = true;
      speechRecognitionInstance.current.interimResults = true;
      speechRecognitionInstance.current.lang = 'es-CO'; 

      speechRecognitionInstance.current.onstart = () => {
        setIsRecording(true);
        setTranscriptError(null);
        setInterimTranscript('');
      };

      speechRecognitionInstance.current.onresult = (event: SpeechRecognitionEvent) => { 
        let finalTranscript = '';
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(currentInterim);
        if (finalTranscript) {
          setPatientInfo((prevInfo) => prevInfo + (prevInfo.endsWith(' ') || prevInfo === '' ? '' : ' ') + finalTranscript + ' ');
          setInterimTranscript(''); 
        }
      };

      speechRecognitionInstance.current.onerror = (event: SpeechRecognitionErrorEvent) => { 
        setTranscriptError(`Error de reconocimiento: ${event.error}`);
        console.error('Speech recognition error', event);
        setIsRecording(false);
      };

      speechRecognitionInstance.current.onend = () => {
        setIsRecording(false);
        setInterimTranscript(''); 
      };
    } else {
      setIsSpeechApiAvailable(false);
      setTranscriptError("La API de reconocimiento de voz no está disponible en este navegador.");
    }

    return () => {
      if (speechRecognitionInstance.current) {
        speechRecognitionInstance.current.stop();
      }
    };
  }, [user]);

  const handleToggleRecording = () => {
    if (!speechRecognitionInstance.current) return;
    if (isRecording) {
      speechRecognitionInstance.current.stop();
    } else {
      try {
        setPatientInfo(prev => prev.trim() + (prev.trim() ? " " : "")); 
        speechRecognitionInstance.current.start();
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        setTranscriptError("No se pudo iniciar el dictado. Verifique los permisos del micrófono.");
        setIsRecording(false);
      }
    }
  };

  const handleSpecialtyChange = (specialtyId: string) => {
    setSelectedSpecialtyId(specialtyId);
    setError(null); 
  };

  const handleSaveTemplate = useCallback((newTemplate: string) => {
    if (!user) return;
    const updatedTemplates = { ...templates, [selectedSpecialtyId]: newTemplate };
    setTemplates(updatedTemplates);
    saveUserTemplates(user.id, updatedTemplates);
  }, [templates, selectedSpecialtyId, user]);

  const addNoteToHistory = (noteData: Omit<HistoricNote, 'id' | 'timestamp'>) => {
    if (!user) return;
    const newHistoricNote: HistoricNote = {
      ...noteData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = addUserHistoricNoteEntry(user.id, newHistoricNote);
    setHistoricNotes(updatedHistory);
  };

  const handleGenerateTemplateNote = async () => {
    if (!patientInfo.trim()) {
      setError("Por favor, ingrese la información del paciente para la plantilla.");
      return;
    }
    setError(null);
    setIsGeneratingTemplateNote(true);
    setGeneratedTemplateNote('');
    setTemplateNoteGrounding(undefined);

    try {
      const currentTemplate = templates[selectedSpecialtyId] || DEFAULT_TEMPLATES[selectedSpecialtyId];
      const specialtyName = specialties.find(s => s.id === selectedSpecialtyId)?.name || selectedSpecialtyId;
      const result = await generateNoteFromTemplate(specialtyName, currentTemplate, patientInfo);
      setGeneratedTemplateNote(result.text);
      setTemplateNoteGrounding(result.groundingMetadata);
      // Sync patientInfo to AI suggestion input
      setAiSuggestionInput(patientInfo);
      // Add to history
      addNoteToHistory({
        type: 'template',
        specialtyId: selectedSpecialtyId,
        specialtyName: specialtyName,
        originalInput: patientInfo,
        content: result.text,
      });

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido al generar la nota.";
      setError(errorMessage);
      setGeneratedTemplateNote(`Error: ${errorMessage}`);
    } finally {
      setIsGeneratingTemplateNote(false);
    }
  };
  
  const handleUpdateGeneratedTemplateNote = (newNote: string) => {
    setGeneratedTemplateNote(newNote);
  };

  const handleGenerateAISuggestions = async () => {
    if (!aiSuggestionInput.trim()) {
      setError("Por favor, ingrese la información clínica para generar sugerencias.");
      return;
    }
    setError(null);
    setIsGeneratingAISuggestion(true);
    setGeneratedAISuggestion('');
    setAiSuggestionGrounding(undefined);

    try {
      const result = await generateAISuggestions(aiSuggestionInput);
      setGeneratedAISuggestion(result.text);
      setAiSuggestionGrounding(result.groundingMetadata);
      // Add to history
      addNoteToHistory({
        type: 'suggestion',
        originalInput: aiSuggestionInput,
        content: result.text,
      });
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido al generar sugerencias.";
      setError(errorMessage);
      setGeneratedAISuggestion(`Error: ${errorMessage}`);
    } finally {
      setIsGeneratingAISuggestion(false);
    }
  };

  const handleGenerateScale = async () => {
    if (!aiSuggestionInput.trim()) {
        setError("Por favor, ingrese la información clínica para generar la escala.");
        return;
    }
    if (selectedScale === 'none') {
        setError("Por favor, seleccione una escala de la lista.");
        return;
    }
    setError(null);
    setIsGeneratingScale(true);
    setGeneratedScale('');
    setScaleGrounding(undefined);

    try {
        const scaleName = MEDICAL_SCALES.find(s => s.id === selectedScale)?.name || selectedScale;
        const result = await generateMedicalScale(aiSuggestionInput, scaleName);
        setGeneratedScale(result.text);
        setScaleGrounding(result.groundingMetadata);
        // Add to history
        addNoteToHistory({
            type: 'scale',
            originalInput: aiSuggestionInput,
            content: result.text,
            scaleId: selectedScale,
            scaleName: scaleName,
        });
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido al generar la escala.";
        setError(errorMessage);
        setGeneratedScale(`Error: ${errorMessage}`);
    } finally {
        setIsGeneratingScale(false);
    }
  };

  const handleLoadFromHistory = (note: HistoricNote) => {
    setActiveView('generate');
    setError(null);
    // Clear all outputs first
    setGeneratedTemplateNote('');
    setGeneratedAISuggestion('');
    setGeneratedScale('');
    setTemplateNoteGrounding(undefined);
    setAiSuggestionGrounding(undefined);
    setScaleGrounding(undefined);
    
    if (note.type === 'template') {
      if (note.specialtyId) setSelectedSpecialtyId(note.specialtyId);
      setPatientInfo(note.originalInput);
      setGeneratedTemplateNote(note.content);
      setAiSuggestionInput(note.originalInput);
    } else if (note.type === 'suggestion') {
      setAiSuggestionInput(note.originalInput);
      setGeneratedAISuggestion(note.content);
      setPatientInfo(''); 
    } else if (note.type === 'scale') {
      setAiSuggestionInput(note.originalInput);
      setGeneratedScale(note.content);
      if (note.scaleId && MEDICAL_SCALES.some(s => s.id === note.scaleId)) {
        setSelectedScale(note.scaleId);
      } else {
        setSelectedScale(MEDICAL_SCALES[0].id); // default to none
      }
      setPatientInfo('');
    }
  };

  const handleClearHistory = () => {
    if (!user) return;
    if(window.confirm("¿Está seguro de que desea borrar todo el historial de notas? Esta acción no se puede deshacer.")) {
        localStorage.removeItem(`notasai_history_${user.id}`); // Clear user-specific history
        setHistoricNotes([]);
    }
  };
  
  const selectedSpecialty = specialties.find(s => s.id === selectedSpecialtyId) || DEFAULT_SPECIALTIES[0];
  
  let currentViewTitle = 'Generador de Notas Clínicas';
  if (activeView === 'templates') currentViewTitle = 'Editor de Plantillas';
  if (activeView === 'history') currentViewTitle = 'Historial de Notas';


  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-dark-bg font-sans">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className="flex-1 flex flex-col ml-64 overflow-hidden"> {/* Adjust ml to match sidebar width */}
        <header className="bg-white dark:bg-neutral-800 shadow-sm p-4 border-b dark:border-dark-border flex justify-between items-center">
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
            {currentViewTitle}
          </h1>
          <UserProfile />
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-100 dark:bg-neutral-900 p-6 space-y-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300 rounded-lg shadow" role="alert">
              <p className="font-bold text-sm">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {activeView === 'templates' && (
            <section aria-labelledby="template-editor-heading" className="bg-white dark:bg-dark-surface shadow-xl rounded-lg p-6">
              <h2 id="template-editor-heading" className="sr-only">Editor de Plantillas</h2>
              <SpecialtySelector
                specialties={specialties}
                selectedSpecialtyId={selectedSpecialtyId}
                onSpecialtyChange={handleSpecialtyChange}
              />
              <TemplateEditor
                template={templates[selectedSpecialtyId] || DEFAULT_TEMPLATES[selectedSpecialtyId] || ''}
                onSaveTemplate={handleSaveTemplate}
                specialtyName={selectedSpecialty.name}
              />
            </section>
          )}

          {activeView === 'generate' && (
            <>
              {/* Section 1: Template-based Note Generation */}
              <section aria-labelledby="template-note-heading" className="bg-white dark:bg-dark-surface shadow-xl rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                     <h2 id="template-note-heading" className="text-xl font-semibold text-primary dark:text-dark-primary mb-3 md:mb-0">
                        Nota con Plantilla de <span className="font-bold">{selectedSpecialty.name}</span>
                     </h2>
                     <SpecialtySelector
                        specialties={specialties}
                        selectedSpecialtyId={selectedSpecialtyId}
                        onSpecialtyChange={handleSpecialtyChange}
                        className="mb-0 md:w-1/2 lg:w-1/3"
                     />
                </div>
                
                <div className="mb-1 flex justify-between items-center">
                  <label htmlFor="patient-info" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Información del Paciente (para plantilla)
                  </label>
                  {isSpeechApiAvailable && (
                    <button
                        onClick={handleToggleRecording}
                        disabled={!isSpeechApiAvailable || !speechRecognitionInstance.current} 
                        className={`p-2 rounded-full transition-colors ${
                          isRecording 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-secondary hover:bg-secondary-dark text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isRecording ? 'Detener dictado' : 'Iniciar dictado por voz'}
                        aria-label={isRecording ? 'Detener dictado por voz' : 'Iniciar dictado por voz para información del paciente'}
                    >
                        <MicrophoneIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <textarea
                  id="patient-info"
                  value={patientInfo}
                  onChange={(e) => { setPatientInfo(e.target.value); setError(null);}}
                  rows={6}
                  className="w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary dark:bg-neutral-700 dark:text-neutral-100 mb-1 transition-colors"
                  placeholder="Ingrese aquí los datos del paciente, síntomas, observaciones para completar la plantilla... o use el botón de micrófono para dictar."
                />
                {!isSpeechApiAvailable && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-2">El dictado por voz no es compatible con este navegador.</p>}
                {interimTranscript && <p className="text-sm text-neutral-600 dark:text-neutral-300 p-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-md my-2"><i>{interimTranscript}</i></p>}
                {transcriptError && <p className="text-xs text-red-600 dark:text-red-400 mt-1 mb-2">{transcriptError}</p>}
                
                <button
                  onClick={handleGenerateTemplateNote}
                  disabled={isGeneratingTemplateNote || isRecording}
                  className="w-full mt-3 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark disabled:opacity-60 dark:focus:ring-offset-neutral-900 transition-colors"
                >
                  {isGeneratingTemplateNote ? (
                    <> <LoadingSpinner className="text-white mr-2" /> Generando Nota...</>
                  ) : (
                    <> <SparklesIcon className="h-5 w-5 mr-2" /> Generar Nota con Plantilla </>
                  )}
                </button>
                <NoteDisplay
                  note={generatedTemplateNote}
                  onNoteChange={handleUpdateGeneratedTemplateNote}
                  title={`Nota Clínica de ${selectedSpecialty.name} (Plantilla)`}
                  isLoading={isGeneratingTemplateNote}
                  groundingMetadata={templateNoteGrounding}
                />
              </section>

              {/* Section 2: AI-Powered Assistance */}
              <section aria-labelledby="ai-assistance-heading" className="bg-white dark:bg-dark-surface shadow-xl rounded-lg p-6">
                 <h2 id="ai-assistance-heading" className="sr-only">Asistente IA Avanzado</h2>
                
                {/* Part 1: General Suggestions */}
                <div>
                    <h3 id="ai-suggestions-heading" className="text-xl font-semibold text-secondary dark:text-dark-secondary mb-3 flex items-center">
                    <LightBulbIcon className="h-6 w-6 mr-2" />
                    Ideas y Sugerencias
                    </h3>
                    <label htmlFor="ai-suggestion-input" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Información Clínica o Consulta para IA
                    </label>
                    <textarea
                    id="ai-suggestion-input"
                    value={aiSuggestionInput}
                    onChange={(e) => {setAiSuggestionInput(e.target.value); setError(null);}}
                    rows={6}
                    className="w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-neutral-700 dark:text-neutral-100 mb-4 transition-colors"
                    placeholder="Describa la situación clínica, preguntas o áreas donde necesita ideas, recomendaciones o un análisis más libre..."
                    />
                    <button
                    onClick={handleGenerateAISuggestions}
                    disabled={isGeneratingAISuggestion}
                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-dark disabled:opacity-60 dark:focus:ring-offset-neutral-900 transition-colors"
                    >
                    {isGeneratingAISuggestion ? (
                        <> <LoadingSpinner className="text-white mr-2" /> Generando Sugerencias...</>
                    ) : (
                        <> <SparklesIcon className="h-5 w-5 mr-2" /> Obtener Sugerencias IA </>
                    )}
                    </button>
                    <NoteDisplay
                    note={generatedAISuggestion}
                    title="Sugerencias y Recomendaciones IA"
                    isLoading={isGeneratingAISuggestion}
                    groundingMetadata={aiSuggestionGrounding}
                    />
                </div>

                {/* Divider */}
                <div className="my-8 border-t border-dashed border-neutral-300 dark:border-neutral-600"></div>

                {/* Part 2: Scale Generator */}
                <div>
                    <h3 id="scale-generator-heading" className="text-xl font-semibold text-secondary dark:text-dark-secondary mb-3 flex items-center">
                    <CalculatorIcon className="h-6 w-6 mr-2" />
                    Generador Automático de Escalas Clínicas
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    Seleccione una escala. La IA utilizará la "Información Clínica" introducida arriba para completarla.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
                        <div className="w-full sm:flex-1">
                            <label htmlFor="scale-select" className="sr-only">Seleccionar Escala</label>
                            <select 
                                id="scale-select" 
                                value={selectedScale}
                                onChange={e => setSelectedScale(e.target.value)}
                                className="w-full pl-3 pr-10 py-2.5 text-base border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm transition-colors"
                            >
                                {MEDICAL_SCALES.map(scale => (
                                    <option key={scale.id} value={scale.id}>{scale.name}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={handleGenerateScale}
                            disabled={isGeneratingScale || selectedScale === 'none'}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-dark disabled:opacity-60 dark:focus:ring-offset-neutral-900 transition-colors"
                        >
                            {isGeneratingScale ? (
                                <><LoadingSpinner className="text-white mr-2" /> Generando...</>
                            ) : (
                                "Generar Escala"
                            )}
                        </button>
                    </div>
                    <NoteDisplay
                        note={generatedScale}
                        title={`Resultado de Escala: ${MEDICAL_SCALES.find(s => s.id === selectedScale)?.name.split('(')[0].trim() || ''}`}
                        isLoading={isGeneratingScale}
                        groundingMetadata={scaleGrounding}
                    />
                </div>
              </section>
            </>
          )}

          {activeView === 'history' && (
            <HistoryView 
                historicNotes={historicNotes}
                loadNoteFromHistory={handleLoadFromHistory}
                clearHistory={handleClearHistory}
            />
          )}

        </main>
        <footer className="text-center p-3 text-xs text-neutral-500 dark:text-neutral-400 border-t dark:border-dark-border bg-white dark:bg-neutral-800">
          <p>© {new Date().getFullYear()} NOTASAI. Potenciado por IA. Nuestra inteligencia artificial se conecta con bases de datos científicas y se esfuerza por ofrecer información y recomendaciones basadas en evidencia.</p>
          <p>La información proporcionada es para fines de asistencia y no sustituye el juicio clínico profesional.</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthenticatedApp;