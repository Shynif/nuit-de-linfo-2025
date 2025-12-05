export interface Question {
    id: number;
    question: string;
    choixGauche: string;
    choixDroite: string;
    nextIdG: number;
    nextIdD: number;
    gPlanete: number;
    gInclusion: number;
    gSecurite: number;
    gBudget: number;
    dPlanete: number;
    dInclusion: number;
    dSecurite: number;
    dBudget: number;
}
