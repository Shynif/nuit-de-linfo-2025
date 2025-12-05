import fs from 'fs';
import path from 'path';

import type { Question } from '$lib/types';
import questionsCsvFile from '$lib/questions/questions.csv?raw';

export class QuestionDatabase {
    private static instance: QuestionDatabase;
    private questions: Map<number, Question> = new Map();
    private isLoaded: boolean = false;

    private constructor() {}

    public static getInstance(): QuestionDatabase {
        if (!QuestionDatabase.instance) {
            QuestionDatabase.instance = new QuestionDatabase();
        }
        return QuestionDatabase.instance;
    }

    private loadData() {
        if (this.isLoaded) return;

        try {
            const lines = questionsCsvFile.split('\n');

            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(';');
                if (parts.length < 14) continue;

                const question: Question = {
                    id: parseInt(parts[0]),
                    question: parts[1],
                    choixGauche: parts[2],
                    choixDroite: parts[3],
                    nextIdG: parseInt(parts[4]),
                    nextIdD: parseInt(parts[5]),
                    gPlanete: parseInt(parts[6]),
                    gInclusion: parseInt(parts[7]),
                    gSecurite: parseInt(parts[8]),
                    gBudget: parseInt(parts[9]),
                    dPlanete: parseInt(parts[10]),
                    dInclusion: parseInt(parts[11]),
                    dSecurite: parseInt(parts[12]),
                    dBudget: parseInt(parts[13]),
                };

                this.questions.set(question.id, question);
            }
            this.isLoaded = true;
            console.log(`Loaded ${this.questions.size} questions from CSV.`);
        } catch (error) {
            console.error('Failed to load questions CSV:', error);
            throw error;
        }
    }

    public getQuestion(id: number): Question | undefined {
        this.loadData();
        return this.questions.get(id);
    }

    public getAllQuestions(): Question[] {
        this.loadData();
        return Array.from(this.questions.values());
    }

    public searchQuestions(query: string): Question[] {
        this.loadData();
        const lowerQuery = query.toLowerCase();
        return Array.from(this.questions.values()).filter(q => 
            q.question.toLowerCase().includes(lowerQuery)
        );
    }
}
