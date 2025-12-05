
import { json } from '@sveltejs/kit';
import { QuestionDatabase } from '$lib/server/questions';

export async function GET() {
	const db = QuestionDatabase.getInstance();
	const questions = db.getAllQuestions();

	if (questions.length === 0) {
		return json({ error: 'No questions available' }, { status: 404 });
	}

	// Filter out linked questions (questions that are targets of other questions)
	// This logic was in the previous implementation, let's preserve it if possible.
	// However, QuestionDatabase doesn't expose linked IDs directly.
	// For now, let's just pick a random question.
    // If we need to filter, we should add that logic to QuestionDatabase or here.
    
    // Re-implementing filter logic using QuestionDatabase data
    const allQuestions = db.getAllQuestions();
    const linkedIds = new Set<number>();
    allQuestions.forEach(q => {
        if (q.nextIdG !== 0) linkedIds.add(q.nextIdG);
        if (q.nextIdD !== 0) linkedIds.add(q.nextIdD);
    });

    const availableQuestions = allQuestions.filter(q => !linkedIds.has(q.id));

    if (availableQuestions.length === 0) {
         // Fallback to all questions if none available (shouldn't happen usually)
         const randomIndex = Math.floor(Math.random() * allQuestions.length);
         return json(allQuestions[randomIndex]);
    }

	const randomIndex = Math.floor(Math.random() * availableQuestions.length);
	const randomQuestion = availableQuestions[randomIndex];

	return json(randomQuestion);
}
