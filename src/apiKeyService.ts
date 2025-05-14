import fs from 'fs/promises';
import path from 'path';

// Place api_keys.json in the project root, outside of src/ or dist/
const API_KEYS_FILE_NAME = 'api_keys.json';
const API_KEYS_FILE_PATH = path.join(__dirname, '..', API_KEYS_FILE_NAME); // Adjust if src is nested, e.g. ../../ for root from dist/src

// Ensure the path is correct based on your build output structure.
// If dist/index.js is running, __dirname is dist. So ../../api_keys.json targets project_root/api_keys.json
// If src/index.ts is run directly with ts-node, __dirname is src. So ../api_keys.json targets project_root/api_keys.json
// For consistency with a build step, let's assume __dirname will be in a 'dist' folder.
// If you run with ts-node from the root, this path might need adjustment or conditional logic.
// A simpler approach for development and build might be to resolve from process.cwd()
// const API_KEYS_FILE_PATH = path.resolve(process.cwd(), API_KEYS_FILE_NAME);


async function readApiKeys(): Promise<string[]> {
    try {
        await fs.access(API_KEYS_FILE_PATH); // Check if file exists
        const data = await fs.readFile(API_KEYS_FILE_PATH, 'utf-8');
        const keys = JSON.parse(data);
        if (Array.isArray(keys) && keys.every(key => typeof key === 'string')) {
            return keys;
        }
        console.warn('api_keys.json does not contain a valid array of strings. Returning empty array.');
        return [];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File does not exist, which is fine, means no keys yet.
            return [];
        }
        console.error('Error reading API keys file:', error);
        return []; // Return empty array on other errors
    }
}

async function writeApiKeys(keys: string[]): Promise<void> {
    try {
        await fs.writeFile(API_KEYS_FILE_PATH, JSON.stringify(keys, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing API keys file:', error);
        throw new Error('Could not save API keys.'); // Propagate error
    }
}

export async function getApiKeys(): Promise<string[]> {
    return await readApiKeys();
}

export async function addApiKey(newKey: string): Promise<{ success: boolean; message: string; count?: number }> {
    if (!newKey || typeof newKey !== 'string' || newKey.trim() === '') {
        return { success: false, message: 'Invalid API key provided.' };
    }

    const trimmedKey = newKey.trim();
    const currentKeys = await readApiKeys();

    if (currentKeys.includes(trimmedKey)) {
        return { success: false, message: 'API key already exists.', count: currentKeys.length };
    }

    currentKeys.push(trimmedKey);
    try {
        await writeApiKeys(currentKeys);
        return { success: true, message: 'API key added successfully.', count: currentKeys.length };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to save API key.' };
    }
}

export async function getApiKeysCount(): Promise<number> {
    const keys = await readApiKeys();
    return keys.length;
}

// Simple round-robin index
let currentKeyIndex = 0;

export async function getNextApiKey(): Promise<string | null> {
    const keys = await readApiKeys();
    if (keys.length === 0) {
        return null;
    }
    const key = keys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    return key;
}

// For testing or specific needs, you might want a way to clear keys (use with caution)
export async function removeApiKey(keyToRemove: string): Promise<{ success: boolean; message: string; count?: number }> {
    if (!keyToRemove || typeof keyToRemove !== 'string' || keyToRemove.trim() === '') {
        return { success: false, message: 'Invalid API key provided for removal.' };
    }
    const trimmedKey = keyToRemove.trim();
    let currentKeys = await readApiKeys();
    const initialLength = currentKeys.length;
    currentKeys = currentKeys.filter(key => key !== trimmedKey);

    if (currentKeys.length === initialLength) {
        return { success: false, message: 'API key not found.', count: currentKeys.length };
    }

    try {
        await writeApiKeys(currentKeys);
        // Reset round-robin index if it's out of bounds
        if (currentKeyIndex >= currentKeys.length) {
            currentKeyIndex = 0;
        }
        return { success: true, message: 'API key removed successfully.', count: currentKeys.length };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to save API keys after removal.' };
    }
}