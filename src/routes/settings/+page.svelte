<script lang="ts">
    import { fly } from 'svelte/transition';
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    // --- Variables d'état initiales (Simulent les données utilisateur actuelles) ---
    // Ces valeurs seraient normalement chargées depuis une API.
    let currentUsername = data.name; // Affichage seulement
    let initialIsPublic = data.hidden;

    // Variables d'état pour les modifications
    let isPublic = $state(initialIsPublic);

    let saveMessage = $state('');

    /**
     * @description Vérifie si les données du formulaire sont différentes des données initiales.
     */
    function isModified(): boolean {
        return isPublic !== initialIsPublic;
    }

    /**
     * @description Fonction de soumission pour sauvegarder les paramètres.
     */
    function handleSave(event: Event) {
        event.preventDefault(); 
        saveMessage = '';

        if (!isModified()) {
            saveMessage = "info: Aucune modification détectée. Les paramètres sont à jour.";
            return;
        }

        // --- Logique de sauvegarde (à remplacer par un appel API réel) ---
        console.log("Sauvegarde des paramètres en cours...");
        console.log({
            newIsPublic: isPublic
        });
        
        // Mise à jour des valeurs initiales
        fetch('/api/hide', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isPublic })
        });
        initialIsPublic = isPublic;

        saveMessage = `success: Paramètres mis à jour ! Visibilité: ${isPublic ? 'Public' : 'Privé'}`;

        // Réinitialiser le message après quelques secondes
        setTimeout(() => {
            saveMessage = '';
        }, 5000);
    }

    /**
     * @description Réinitialise le formulaire aux dernières valeurs sauvegardées.
     */
    function handleCancel() {
        isPublic = initialIsPublic;
        saveMessage = "info: Modifications annulées. Formulaire réinitialisé.";
        
        // Réinitialiser le message après quelques secondes
        setTimeout(() => {
            saveMessage = '';
        }, 3000);
    }
</script>

<div class="settings-page">
    <h2>Paramètres du Compte</h2>
    <p class="current-user">Connecté en tant que: <strong>{currentUsername}</strong></p>

    {#if saveMessage}
        <p class="message" 
            class:error={saveMessage.startsWith('error')}
            class:success={saveMessage.startsWith('success')}
            class:info={saveMessage.startsWith('info')}
            transition:fly={{ y: -10, duration: 300 }}
        >
            {saveMessage.substring(saveMessage.indexOf(':') + 1).trim()}
        </p>
    {/if}

    <form onsubmit={handleSave}>

        <div class="form-group checkbox-group">
            <input 
                id="isPublic" 
                type="checkbox" 
                bind:checked={isPublic} 
            />
            <label for="isPublic">
                Visibilité du Compte : 
                <span class="status" class:is-public={isPublic}>
                    {isPublic ? 'Public' : 'Privé'}
                </span>
            </label>
            <p class="help-text">Si Public, votre profil est visible par tous les autres utilisateurs du site.</p>
        </div>

        <hr>
        
        <div class="actions">
            <button type="submit" disabled={!isModified()}>
                Sauvegarder les changements
            </button>
            
            <button type="button" class="cancel" onclick={handleCancel} disabled={!isModified()}>
                Annuler
            </button>
        </div>
    </form>
</div>

<style>
    /* ---------------------------------- */
    /* Styles généraux du Conteneur */
    /* ---------------------------------- */
    .settings-page {
        max-width: 600px;
        margin: 4rem auto;
        padding: 2.5rem;
        border: 1px solid #e0e0e0;
        border-radius: 10px;
        background-color: #f7f9fc;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    }

    h2 {
        text-align: center;
        margin-bottom: 1rem;
        color: #333;
    }

    .current-user {
        text-align: center;
        color: #777;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px dashed #ddd;
    }

    /* ---------------------------------- */
    /* Styles des Champs de Formulaire */
    /* ---------------------------------- */
    .form-group {
        margin-bottom: 2rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 700;
        color: #444;
        font-size: 1.1rem;
    }

    input[type="text"] {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        box-sizing: border-box; 
        font-size: 1rem;
    }

    .help-text {
        font-size: 0.9rem;
        color: #888;
        margin-top: 0.5rem;
    }

    hr {
        border: 0;
        height: 1px;
        background: #eee;
        margin: 2rem 0;
    }

    /* ---------------------------------- */
    /* Styles Checkbox Visibilité */
    /* ---------------------------------- */
    .checkbox-group {
        display: flex;
        flex-direction: column; /* Permet à la description d'être en dessous */
    }
    
    .checkbox-group label {
        display: flex;
        align-items: center;
        cursor: pointer;
    }

    input[type="checkbox"] {
        margin-right: 10px;
        transform: scale(1.3);
        /* Style simple de la checkbox */
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border: 2px solid #555;
        border-radius: 3px;
        position: relative;
        cursor: pointer;
    }

    input[type="checkbox"]:checked {
        background-color: #28a745; /* Vert pour coché */
        border-color: #28a745;
    }
    
    input[type="checkbox"]:checked::after {
        content: '✓';
        color: white;
        font-size: 12px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .status {
        font-weight: 700;
        margin-left: 10px;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.95rem;
        color: #dc3545; /* Rouge par défaut (Privé) */
        background-color: #f8d7da;
    }

    .status.is-public {
        color: #28a745; /* Vert (Public) */
        background-color: #d4edda;
    }


    /* ---------------------------------- */
    /* Styles Boutons */
    /* ---------------------------------- */
    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
    }

    button {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        transition: opacity 0.2s, background-color 0.2s;
    }

    button[type="submit"] {
        background-color: #007bff; /* Bleu primaire */
        color: white;
    }

    button[type="submit"]:hover:not(:disabled) {
        background-color: #0056b3;
    }

    button.cancel {
        background-color: #6c757d; /* Gris secondaire */
        color: white;
    }

    button.cancel:hover:not(:disabled) {
        background-color: #5a6268;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    /* ---------------------------------- */
    /* Styles Messages */
    /* ---------------------------------- */
    .message {
        padding: 0.75rem;
        margin-bottom: 1.5rem;
        border-radius: 4px;
        font-weight: 500;
        text-align: center;
        border: 1px solid transparent;
    }

    .error {
        background-color: #f8d7da;
        color: #721c24;
        border-color: #f5c6cb;
    }

    .success {
        background-color: #d4edda;
        color: #155724;
        border-color: #c3e6cb;
    }
    
    .info {
        background-color: #cce5ff;
        color: #004085;
        border-color: #b8daff;
    }
</style>