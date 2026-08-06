<script lang="ts">
  import { onMount } from 'svelte';
  import { uploadLocations } from '../utils/upload';
  import ToastNotification from './ToastNotification.svelte';
  import { clearApiKey, getApiKey, saveApiKey, URL_TO_GENERATE_TOKEN } from '../utils/apiKey';
  import { modalDialog } from '../utils/modalDialog';

  let { mapId }: { mapId: string } = $props();

  let showApiKeyModal = $state(false);
  let modalMode = $state<'upload' | 'manage'>('upload');
  let apiKeyInput = $state('');
  let currentApiKey = $state<string | null>(null);
  let isLoading = $state(false);

  let toastState = $state<{
    message: string;
    detail?: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  let toastTimer = $state<number | undefined>(undefined);

  function showCustomToast(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 3000,
    detail?: string
  ) {
    clearTimeout(toastTimer);

    const displayToast = () => {
      toastState = { message, detail, type };
      if (duration > 0) {
        toastTimer = window.setTimeout(() => {
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
      return getApiKey();
    } catch (e) {
      console.warn('GM_getValue is not available. API key functionality might be limited.', e);
      showCustomToast(
        'Userscript storage (GM_getValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.',
        'error',
        0
      );
      return null;
    }
  }

  function saveApiKeyToGM(key: string): void {
    try {
      saveApiKey(key);
    } catch (e) {
      console.warn('GM_setValue is not available. API key functionality might be limited.', e);
      showCustomToast(
        'Userscript storage (GM_setValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.',
        'error',
        0
      );
    }
  }

  onMount(() => {
    currentApiKey = getApiKeyFromGM();
  });

  async function handleUploadClick() {
    if (isLoading) return;
    currentApiKey = getApiKeyFromGM();
    if (!currentApiKey || currentApiKey.trim() === '') {
      apiKeyInput = '';
      modalMode = 'upload';
      showApiKeyModal = true;
    } else {
      await performUpload(currentApiKey);
    }
  }

  function openManageKeyModal() {
    currentApiKey = getApiKeyFromGM();
    apiKeyInput = '';
    modalMode = 'manage';
    showApiKeyModal = true;
  }

  function handleClearApiKey() {
    clearApiKey();
    currentApiKey = null;
    showApiKeyModal = false;
    showCustomToast('LearnableMeta API Key cleared.', 'success');
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
      const detail =
        error && error.message ? error.message : 'An unexpected error occurred during upload.';

      const isAuthError = /401|403|unauthorized|invalid token/i.test(detail);
      const headline = isAuthError
        ? 'Upload failed: your API key was rejected. Use the 🔑 button next to Upload to update it.'
        : 'Upload failed. If this keeps happening, please report the error below on our Discord.';

      showCustomToast(headline, 'error', 0, detail);
      isLoading = false;
    }
  }

  function handleSaveApiKey() {
    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey) {
      showCustomToast('Please enter a valid API key.', 'error', 3000);
      return;
    }
    saveApiKeyToGM(trimmedKey);
    currentApiKey = trimmedKey;
    showApiKeyModal = false;
    showCustomToast('API Key saved!', 'success', 2000);
    if (modalMode === 'upload') {
      performUpload(trimmedKey);
    }
  }

  function handleCancelModal() {
    showApiKeyModal = false;
    apiKeyInput = '';
  }
</script>

<div class="upload-label-container learnablemeta-ui">
  <button class="learnablemeta-geoguessr-button" onclick={handleUploadClick} disabled={isLoading}>
    {isLoading ? 'Uploading...' : 'LearnableMeta - Upload'}
  </button>
  <button
    class="learnablemeta-geoguessr-button learnablemeta-geoguessr-button--icon"
    onclick={openManageKeyModal}
    disabled={isLoading}
    title="Manage LearnableMeta API key"
    aria-label="Manage LearnableMeta API key">
    🔑
  </button>
</div>

{#if showApiKeyModal}
  <div class="learnablemeta-modal-backdrop learnablemeta-ui" role="presentation">
    <div
      class="learnablemeta-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apiKeyModalTitle"
      use:modalDialog={{ onClose: handleCancelModal }}>
      <div class="learnablemeta-modal-header">
        <p class="learnablemeta-modal-eyebrow">LearnableMeta</p>
        <h2 class="learnablemeta-modal-title" id="apiKeyModalTitle">API token</h2>
        <p class="learnablemeta-modal-description">
          Manage the token used to download synchronized locations.
        </p>
      </div>
      <div class="learnablemeta-modal-body">
        {#if modalMode === 'upload'}
          <p>An API token is required before locations can be uploaded.</p>
        {:else if currentApiKey}
          <p>
            A token ending in <code class="saved-key">…{currentApiKey.slice(-4)}</code> is saved. Paste
            a new token to replace it, or clear the saved token.
          </p>
        {:else}
          <p>No API token is saved yet.</p>
        {/if}
        <p>
          Generate or replace your token on the
          <a href={URL_TO_GENERATE_TOKEN} target="_blank" rel="noopener noreferrer">
            LearnableMeta profile page</a
          >.
        </p>
        <input
          type="text"
          bind:value={apiKeyInput}
          placeholder="Paste your API token"
          aria-label="LearnableMeta API token"
          data-modal-initial-focus
          class="learnablemeta-modal-input" />
        <p class="learnablemeta-modal-note">
          The token is stored only in your browser's userscript storage.
        </p>
      </div>
      <div class="learnablemeta-modal-actions">
        {#if modalMode === 'manage' && currentApiKey}
          <button
            type="button"
            onclick={handleClearApiKey}
            class="learnablemeta-button learnablemeta-button--destructive learnablemeta-modal-action-leading">
            Clear token
          </button>
        {/if}
        <button
          type="button"
          onclick={handleCancelModal}
          class="learnablemeta-button learnablemeta-button--outline">Cancel</button>
        <button
          type="button"
          onclick={handleSaveApiKey}
          class="learnablemeta-button learnablemeta-button--primary">
          {modalMode === 'upload' ? 'Save and upload' : 'Save'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if toastState}
  <ToastNotification
    message={toastState.message}
    detail={toastState.detail}
    type={toastState.type}
    onClose={hideCustomToast} />
{/if}

<style>
  .upload-label-container {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .saved-key {
    border-radius: 4px;
    padding: 2px 5px;
    background: var(--lm-muted);
    color: var(--lm-foreground);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }
</style>
