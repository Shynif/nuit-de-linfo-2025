import { json } from '@sveltejs/kit';
import { QuestionDatabase } from '$lib/server/questions';

export async function GET({ params }) {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
        return json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = QuestionDatabase.getInstance();
    const question = db.getQuestion(id);

    if (!question) {
        return json({ error: 'Question not found' }, { status: 404 });
    }

    return json(question);
}