<script lang="ts">
  import { onMount } from 'svelte';
  import { uploadLocations } from '../utils/upload';
  import { GM_setValue, GM_getValue, GM_registerMenuCommand } from '$';
  import ToastNotification from './ToastNotification.svelte';

  let { mapId }: { mapId: string } = $props();

  const API_KEY_STORAGE_NAME = 'learnableMeta_apiKey';
  // TODO: change before building for release
  const URL_TO_GENERATE_TOKEN = "http://localhost:5173/dev/dash/profile/token"

  let showApiKeyModal = $state(false);
  let apiKeyInput = $state('');
  let currentApiKey = $state<string | null>(null);
  let isLoading = $state(false);

  let toastState = $state<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  let toastTimer = $state<number | undefined>(undefined);

  function showCustomToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
    clearTimeout(toastTimer);

    const displayToast = () => {
      toastState = { message, type };
      if (duration > 0) {
        toastTimer = setTimeout(() => {
          hideCustomToast();
        }, duration);
      }
    };

    if (toastState) {
      hideCustomToast();
      setTimeout(displayToast, 350);
    } else {
      displayToast();
    }
  }

  function hideCustomToast() {
    clearTimeout(toastTimer);
    toastState = null;
  }

  function getApiKeyFromGM(): string | null {
    try {
      return GM_getValue(API_KEY_STORAGE_NAME, null);
    } catch (e) {
      console.warn('GM_getValue is not available. API key functionality might be limited.', e);
      showCustomToast('Userscript storage (GM_getValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.', 'error', 0);
      return null;
    }
  }

  function saveApiKeyToGM(key: string): void {
    try {
      GM_setValue(API_KEY_STORAGE_NAME, key);
    } catch (e) {
      console.warn('GM_setValue is not available. API key functionality might be limited.', e);
      showCustomToast('Userscript storage (GM_setValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.', 'error', 0);
    }
  }

  onMount(() => {
    currentApiKey = getApiKeyFromGM();

    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('LearnableMeta - Set/Update API Key', () => {
        currentApiKey = null;
        const newKey = prompt('Enter your new LearnableMeta API Key:');
        if (newKey && newKey.trim() !== '') {
          saveApiKeyToGM(newKey.trim());
          currentApiKey = newKey.trim();
          showCustomToast('LearnableMeta API Key updated!', 'success');
        } else if (newKey !== null) {
          showCustomToast('API Key not updated (empty value provided).', 'info');
        }
      });
      GM_registerMenuCommand('LearnableMeta - Clear API Key', () => {
        if (confirm('Are you sure you want to clear your LearnableMeta API Key?')) {
          saveApiKeyToGM('');
          currentApiKey = null;
          showCustomToast('LearnableMeta API Key cleared.', 'success');
        }
      });
    }
  });

  async function handleUploadClick() {
    if (isLoading) return;
    currentApiKey = getApiKeyFromGM();
    if (!currentApiKey || currentApiKey.trim() === '') {
      apiKeyInput = '';
      showApiKeyModal = true;
    } else {
      await performUpload(currentApiKey);
    }
  }

  async function performUpload(apiKey: string) {
    isLoading = true;
    try {
      await uploadLocations(mapId, apiKey);
      showCustomToast(
        'Locations uploaded and map published successfully! The page will refresh shortly.',
        'success',
        4500
      );
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (error: any) {
      console.error('Upload process failed:', error);
      let toastMessage = 'An unexpected error occurred during upload.';
      if (error && error.message) {
        toastMessage = error.message;
      }

      if (toastMessage.includes('401') || toastMessage.includes('403') || toastMessage.toLowerCase().includes('unauthorized') || toastMessage.toLowerCase().includes('invalid token')) {
        showCustomToast(`Upload failed: ${toastMessage}. Please check your API Key.`, 'error', 0);
      } else {
        showCustomToast(`Upload failed: ${toastMessage}`, 'error', 0);
      }
      isLoading = false;
    }
  }

  function handleSaveApiKey() {
    const trimmedKey = apiKeyInput.trim();
    if (trimmedKey) {
      saveApiKeyToGM(trimmedKey);
      currentApiKey = trimmedKey;
      showApiKeyModal = false;
      showCustomToast('API Key saved!', 'success', 2000);
      performUpload(trimmedKey);
    } else {
      showCustomToast('Please enter a valid API key.', 'error', 3000);
    }
  }

  function handleCancelModal() {
    showApiKeyModal = false;
    apiKeyInput = '';
  }
</script>

<div class="upload-label-container">
  <button
    class="button_button__aR6_e button_sizeSmall__MB_qj custom-yellow-button"
    onclick={handleUploadClick}
    disabled={isLoading}
  >
    {isLoading ? 'Uploading...' : 'LearnableMeta - Upload'}
  </button>
</div>

{#if showApiKeyModal}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="apiKeyModalTitle">
    <div class="modal-content">
      <h2 id="apiKeyModalTitle">Enter LearnableMeta API Key</h2>
      <p>An API key is required to upload locations. Please paste your key below.</p>
      <p>
        You can generate your API token by visiting

        <a href={URL_TO_GENERATE_TOKEN} target="_blank" rel="noopener noreferrer">
          profile page
        </a>
        on LearnableMeta and generating it there.
      </p>
      <input
        type="text"
        bind:value={apiKeyInput}
        placeholder="Paste your API key here"
        aria-label="API Key Input"
        class="modal-input"
      />
      <div class="modal-actions">
        <button onclick={handleSaveApiKey} class="modal-button modal-button-save">Save & Upload</button>
        <button onclick={handleCancelModal} class="modal-button modal-button-cancel">Cancel</button>
      </div>
      <p class="modal-note">Your API key will be stored securely in your browser's userscript storage for future
        use.</p>
    </div>
  </div>
{/if}

{#if toastState}
  <ToastNotification
    message={toastState.message}
    type={toastState.type}
    onClose={hideCustomToast}
  />
{/if}

<style>
  .custom-yellow-button {
    background-color: #f5c542;
    border-color: #e0b000;
    color: darkblue;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }

  .custom-yellow-button:hover {
    background-color: #eab308;
    border-color: #d39e00;
  }

  .custom-yellow-button:disabled {
    background-color: #cccccc;
    border-color: #aaaaaa;
    color: #666666;
    cursor: not-allowed;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }

  .modal-content {
    background-color: white;
    padding: 25px 30px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 450px;
    color: #333;
  }

  .modal-content h2 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #2c3e50;
  }

  .modal-content p {
    margin-bottom: 15px;
    line-height: 1.6;
  }

  .modal-content p a {
    color: #007bff;
    text-decoration: underline;
  }

  .modal-content p a:hover {
    color: #0056b3;
  }

  .modal-input {
    width: calc(100% - 20px);
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1em;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .modal-button {
    padding: 10px 18px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s ease;
  }

  .modal-button-save {
    background-color: #28a745;
    color: white;
  }

  .modal-button-save:hover {
    background-color: #218838;
  }

  .modal-button-cancel {
    background-color: #6c757d;
    color: white;
  }

  .modal-button-cancel:hover {
    background-color: #5a6268;
  }

  .modal-note {
    font-size: 0.85em;
    color: #555;
    margin-top: 15px;
    text-align: center;
  }
</style>
