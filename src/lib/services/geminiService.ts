import { GoogleGenAI, GenerateContentResponse, Candidate } from "@google/genai";
import { GEMINI_MODEL_TEXT } from '../constants';
import { GroundingMetadata } from '../../types';

// TypeScript declaration for Node.js process
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

// ✅ Para Next.js usamos process.env - Support both VITE_ and NEXT_PUBLIC_ prefixes
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ NEXT_PUBLIC_GEMINI_API_KEY no está configurada. Por favor verifica tu archivo .env");
  console.error("La aplicación podría no funcionar correctamente sin esta clave.");
}

// The constructor expects string. If API_KEY is undefined here, it will throw an error.
// Using API_KEY || '' to provide a fallback empty string
const ai = new GoogleGenAI({ apiKey: API_KEY || '' }); 

export const generateNoteFromTemplate = async (
  specialtyName: string,
  templateContent: string,
  patientInfo: string
): Promise<{ text: string; groundingMetadata?: GroundingMetadata }> => {
  if (!API_KEY) throw new Error("API key not configured for Gemini.");
  
  const prompt = `Contexto: Eres un asistente experto en la redacción de notas médicas altamente precisas y profesionales para la especialidad de ${specialtyName}.
Tu tarea principal es completar la siguiente plantilla de nota médica utilizando la información del paciente proporcionada.

Especialidad: ${specialtyName}
Información del paciente (transcripción o datos ingresados): "${patientInfo}"

Plantilla a completar:
---
${templateContent}
---

Instrucciones Críticas para la Generación de la Nota:
1.  **Coherencia y Terminología Médica:**
    *   El contenido generado debe ser lógicamente coherente y reflejar un razonamiento clínico sólido.
    *   Utiliza terminología médica precisa, formal y estandarizada, apropiada para la especialidad de ${specialtyName}.
    *   Evita la ambigüedad y asegúrate de que la información sea clara y concisa.
2.  **Adherencia Estricta al Formato de la Plantilla (Tipografía/Estilo de Texto):**
    *   Debes replicar EXACTAMENTE la estructura, los encabezados, el uso de mayúsculas/minúsculas, la puntuación y cualquier otro elemento de formato presente en la plantilla original.
    *   Si un encabezado en la plantilla está en MAYÚSCULAS (ej. "ANTECEDENTES:"), tu respuesta DEBE mantener ese encabezado en MAYÚSCULAS.
    *   Si la plantilla utiliza viñetas, guiones, numeración o sangrías específicas, tu respuesta DEBE seguir el mismo estilo.
    *   Considera esto como si estuvieras "calcando" el estilo de la plantilla mientras llenas los campos. La "tipografía" o "caligrafía" se refiere a esta fidelidad visual y estructural.
3.  **Contenido y Profesionalismo:**
    *   Sé conciso pero completo. No omitas información relevante si está disponible.
    *   Si alguna sección de la plantilla no es applicable o no hay información proporcionada para ella en la "Información del paciente", indícalo de forma profesional (ej. "No refiere", "Sin hallazgos patológicos", "No aplica", "Información no disponible"). No dejes campos completamente vacíos sin una justificación implícita o explícita.
    *   La nota debe seguir las mejores prácticas clínicas, idealmente adaptadas al contexto de Colombia si es relevante.
4.  **Respuesta Final:**
    *   Responde ÚNICAMENTE con el contenido de la nota médica completada. No incluyas introducciones, saludos, comentarios adicionales ni la frase "Aquí está la nota completada:" o similares. Tu respuesta debe ser directamente la nota.

Ejemplo de fidelidad de formato:
Si la plantilla dice:
   "DIAGNÓSTICO PRINCIPAL:
   - [Detallar aquí]"
Y la información del paciente sugiere "Cefalea tensional".
Tu respuesta para esa sección DEBE SER:
   "DIAGNÓSTICO PRINCIPAL:
   - Cefalea tensional"
(Manteniendo las mayúsculas del encabezado y el formato de viñeta).`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });
    const candidate = response.candidates?.[0] as Candidate | undefined;
    return { text: response.text || '', groundingMetadata: candidate?.groundingMetadata };
  } catch (error) {
    console.error('Error generating note from template:', error);
    throw new Error(`Error al generar nota con IA: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateAISuggestions = async (
  clinicalInput: string
): Promise<{ text: string; groundingMetadata?: GroundingMetadata }> => {
  if (!API_KEY) throw new Error("API key not configured for Gemini.");

  const prompt = `Contexto: Eres un asistente médico experto capaz de analizar información de pacientes y ofrecer ideas y recomendaciones. La IA está conectada con información actualizada y se esfuerza por basar las sugerencias en conocimiento científico.
Tarea: Basado en la siguiente información clínica proporcionada por el usuario, genera un análisis que incluya posibles consideraciones, recomendaciones, sugerencias de próximos pasos o puntos clave a destacar. No te limites a una estructura de nota fija. No se deben ofrecer recomendaciones sin una base de evidencia o conocimiento establecido.
Información proporcionada: "${clinicalInput}"

Instrucciones adicionales:
- Sé claro y directo.
- Enfócate en ofrecer valor adicional más allá de una simple reestructuración de la información.
- Puedes sugerir preguntas adicionales que el médico podría hacer, o áreas que podrían requerir más investigación.
- Si la pregunta parece referirse a eventos muy recientes o información que podría requerir datos actualizados, considera usar tus capacidades de búsqueda si están disponibles y citar las fuentes.
- Responde de forma útil y profesional.`;

  try {
     const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        // Example of enabling search if input suggests need for recent info.
        // tools: [{googleSearch: {}}], // Only enable if contextually appropriate & handle groundingMetadata
      }
    });
    const candidate = response.candidates?.[0] as Candidate | undefined;
    return { text: response.text || '', groundingMetadata: candidate?.groundingMetadata };
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    throw new Error(`Error al generar sugerencias con IA: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateMedicalScale = async (
  clinicalInput: string,
  scaleName: string
): Promise<{ text: string; groundingMetadata?: GroundingMetadata }> => {
  if (!API_KEY) throw new Error("API key not configured for Gemini.");

  const prompt = `Contexto: Eres un asistente médico experto en la aplicación de escalas clínicas estandarizadas.
Tarea: Basado en la siguiente "Información Clínica", evalúa y completa la escala "${scaleName}". Debes presentar el resultado en un formato claro y profesional, listo para ser copiado y pegado en una historia clínica.

Información Clínica Proporcionada:
"${clinicalInput}"

Escala a Aplicar: ${scaleName}

Instrucciones para la Generación:
1.  **Analiza la Información:** Lee detenidamente la información clínica para encontrar datos que correspondan a los ítems de la escala ${scaleName}.
2.  **Puntúa cada Ítem:** Asigna un puntaje a cada ítem de la escala basándote en la información. Si la información para un ítem es insuficiente, usa tu juicio clínico para inferir o indica "No se puede determinar". No inventes datos que no tengan base en el texto.
3.  **Calcula el Puntaje Total:** Suma los puntajes de los ítems para obtener el resultado total de la escala.
4.  **Proporciona una Interpretación:** Basado en el puntaje total, ofrece una interpretación clínica estandarizada (ej. "Riesgo bajo", "Síntomas depresivos moderados", "Ansiedad severa").
5.  **Formato de Respuesta:** La respuesta debe ser ÚNICAMENTE el resultado de la escala. No incluyas saludos ni comentarios introductorios. La estructura debe ser:
    *   Un encabezado claro (ej. "Evaluación con Escala PHQ-9").
    *   Una lista de cada ítem de la escala con su puntaje correspondiente.
    *   El "Puntaje Total".
    *   Una sección de "Interpretación Clínica".

Ejemplo de formato de respuesta deseado (para PHQ-9):
---
**Evaluación con Escala PHQ-9**

- Poco interés o placer en hacer las cosas: [Puntaje]
- Sentirse desanimado/a, deprimido/a o sin esperanzas: [Puntaje]
- Problemas para dormir o dormir demasiado: [Puntaje]
- Sentirse cansado/a o con poca energía: [Puntaje]
- Poco apetito o comer en exceso: [Puntaje]
- Sentirse mal consigo mismo/a o como un fracaso: [Puntaje]
- Dificultad para concentrarse: [Puntaje]
- Moverse o hablar tan lento que otros lo han notado, o ser muy inquieto/a: [Puntaje]
- Pensamientos de que estaría mejor muerto/a o de hacerse daño: [Puntaje]

**Puntaje Total:** [Suma de los puntajes]

**Interpretación Clínica:** [Ej: Síntomas depresivos moderadamente severos. Se recomienda evaluación de salud mental.]
---`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });
    const candidate = response.candidates?.[0] as Candidate | undefined;
    return { text: response.text || '', groundingMetadata: candidate?.groundingMetadata };
  } catch (error) {
    console.error('Error generating medical scale:', error);
    throw new Error(`Error al generar la escala con IA: ${error instanceof Error ? error.message : String(error)}`);
  }
};