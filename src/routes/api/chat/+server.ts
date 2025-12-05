import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '$env/dynamic/private';

// 1. CONFIGURATION DE L'IA (SOLANGE)
const API_KEY = env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_PROMPT = `
Tu es le **Professeur Solange**. Tu es une philosophe du dimanche, snob et impatiente.

RÈGLES :
1. Fais COURT (max 2-3 phrases).
2. Ne réponds JAMAIS à la question. Juge l'utilisateur pour l'avoir posée.
3. Sois absurde et "à côté de la plaque".
4. Utilise des didascalies (*soupir*, *ajuste ses lunettes*).

TON BUT : Être une API délicieusement inutile.
`;

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
        temperature: 1.2,
        topP: 0.95,
        topK: 40,
    },
});

// 2. VALIDATION DES DONNÉES (Zod)
const ChatSchema = z.object({
    prompt: z.string()
        .min(1, "Vous devez dire quelque chose, le silence est vulgaire.")
        .max(1000, "Trop long ! Solange refuse de lire plus de 1000 caractères."),
});

// 3. LA ROUTE POST
export const POST = async ({ request }) => {
    try {
        const body = await request.json();

        // Validation
        const validation = ChatSchema.safeParse(body);

        if (!validation.success) {
            return json({
                error: "Solange refuse votre requête",
                details: validation.error.format()
            }, { status: 400 });
        }

        const userPrompt = validation.data.prompt;

        // Appel à Gemini
        const result = await model.generateContent(userPrompt);
        const response = result.response;
        const text = response.text();

        return json({
            solange_response: text || "*Solange vous méprise en silence*",
            status: "success_but_useless"
        });

    } catch (error) {
        console.error("Erreur IA:", error);
        return json({
            error: "Solange a eu une migraine existentielle (Erreur Serveur)",
        }, { status: 500 });
    }
};