<script lang="ts">
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { superForm } from 'sveltekit-superforms';
  import Tooltip from '$lib/components/Tooltip.svelte';

  let { data } = $props();

  let regenerateDialogOpen = $state(false);
  let copied = $state(false);
  let tokenVisible = $state(false);

  // svelte-ignore state_referenced_locally
  const regenerateApiToken = superForm(data.regenerateApiTokenForm, {
    resetForm: false,
    onUpdated: ({ form }) => {
      if (form.valid && form.data.newRawToken && form.message?.includes('generated successfully')) {
        regenerateDialogOpen = false;
        copied = false;
      }
    }
  });
  const {
    form: regenerateApiTokenFormStore,
    errors: regenerateApiTokenErrors,
    enhance: regenerateApiTokenEnhance,
    message: regenerateApiTokenMessage
  } = regenerateApiToken;

  let showNewToken = $derived(
    $regenerateApiTokenFormStore.newRawToken &&
      $regenerateApiTokenMessage?.includes('generated successfully')
  );

  function openRegenerateDialog() {
    if ($regenerateApiTokenFormStore.newRawToken) {
      $regenerateApiTokenFormStore.newRawToken = undefined;
    }
    if ($regenerateApiTokenMessage) {
      $regenerateApiTokenMessage = undefined;
    }
    copied = false;
    tokenVisible = false;
    regenerateDialogOpen = true;
  }

  async function copyTokenToClipboard() {
    if (!$regenerateApiTokenFormStore.newRawToken) return;
    try {
      await navigator.clipboard.writeText($regenerateApiTokenFormStore.newRawToken);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy token: ', err);
      alert('Failed to copy token to clipboard.');
    }
  }

  function dismissNewTokenAlert() {
    $regenerateApiTokenFormStore.newRawToken = undefined;
    $regenerateApiTokenMessage = undefined;
    copied = false;
    tokenVisible = false;
  }

  function toggleTokenVisibility() {
    tokenVisible = !tokenVisible;
  }
</script>

<div class="p-4 md:p-8">
  <h2 class="text-3xl font-bold tracking-tight mb-6">API Token Management</h2>

  {#if $regenerateApiTokenMessage && !showNewToken}
    <Alert class="mb-4">
      <Icon
        icon={$regenerateApiTokenErrors && Object.keys($regenerateApiTokenErrors).length > 0
          ? 'mdi:alert-circle'
          : 'mdi:check-circle'}
        class="h-4 w-4" />
      <AlertDescription>
        {$regenerateApiTokenMessage}
      </AlertDescription>
    </Alert>
  {/if}

  {#if showNewToken && $regenerateApiTokenFormStore.newRawToken}
    <Alert class="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <Icon icon="mdi:information" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription>
        <div class="space-y-3">
          <div class="font-medium text-blue-800 dark:text-blue-200">
            {$regenerateApiTokenMessage || 'Your New API Token:'}
          </div>
          <div class="flex items-center space-x-2">
            <Badge
              variant="secondary"
              class="min-h-0 h-auto leading-tight px-2 py-1.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 border break-all flex-1  {tokenVisible
                ? 'select-text'
                : 'blur-sm select-none cursor-pointer'}"
              onclick={!tokenVisible ? toggleTokenVisibility : (event) => event.stopPropagation()}>
              {$regenerateApiTokenFormStore.newRawToken}
            </Badge>
            <Tooltip content={tokenVisible ? 'Hide token' : 'Show token'}>
              <Button
                variant="outline"
                size="sm"
                class="p-2 h-8 w-8"
                onclick={toggleTokenVisibility}
                aria-label={tokenVisible ? 'Hide API token' : 'Show API token'}>
                {#if tokenVisible}
                  <Icon icon="mdi:eye-off" class="w-4 h-4" />
                {:else}
                  <Icon icon="mdi:eye" class="w-4 h-4" />
                {/if}
              </Button>
            </Tooltip>
            <Tooltip content={copied ? 'Copied!' : 'Copy to clipboard'}>
              <Button
                variant="outline"
                size="sm"
                class="p-2 h-8 w-8"
                onclick={copyTokenToClipboard}
                aria-label="Copy API token">
                {#if copied}
                  <Icon icon="mdi:check" class="w-4 h-4 text-green-500" />
                {:else}
                  <Icon icon="mdi:content-copy" class="w-4 h-4" />
                {/if}
              </Button>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              class="p-2 h-8 w-8"
              onclick={dismissNewTokenAlert}
              aria-label="Dismiss alert">
              <Icon icon="mdi:close" class="w-4 h-4" />
            </Button>
          </div>
          <p class="text-xs text-blue-700 dark:text-blue-300">
            Please copy this token. It will not be shown again after you navigate away or close this
            message. Click the token or the eye icon to {tokenVisible ? 'hide' : 'show'} it.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  {/if}

  <Card class="w-full max-w-lg">
    <CardHeader>
      <CardTitle class="text-lg">
        {data.hasApiToken ? 'Manage Your API Token' : 'Generate API Token'}
      </CardTitle>
      <CardDescription>
        {#if data.hasApiToken}
          You currently have an active API token. You can invalidate your current token and generate
          a new one. This action cannot be undone, and your old token will stop working immediately.
        {:else}
          Generate an API token to interact with our services programmatically. Keep your token
          secure and do not share it.
        {/if}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {#if data.hasApiToken}
        <Button variant="destructive" onclick={openRegenerateDialog}>
          <Icon icon="mdi:key-change" class="mr-2 h-5 w-5" />
          Invalidate and Regenerate Token
        </Button>
      {:else}
        <form action="?/regenerateApiToken" method="post" use:regenerateApiTokenEnhance>
          <Button type="submit">
            <Icon icon="mdi:key-plus" class="mr-2 h-5 w-5" />
            Generate API Token
          </Button>
        </form>
      {/if}
    </CardContent>
  </Card>
</div>

<Dialog bind:open={regenerateDialogOpen}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        <Icon icon="mdi:alert-octagon-outline" class="h-5 w-5 text-amber-500" />
        Confirm Token Regeneration
      </DialogTitle>
      <DialogDescription class="space-y-3">
        <p>Are you sure you want to proceed?</p>
        <p class="text-sm">
          If you have an existing token, it will be invalidated immediately and a new one will be
          generated. If you don't have a token, a new one will be generated. This action cannot be
          undone.
        </p>
      </DialogDescription>
    </DialogHeader>
    <form
      action="?/regenerateApiToken"
      method="post"
      use:regenerateApiTokenEnhance
      class="flex justify-end gap-3 mt-6">
      <Button
        variant="outline"
        type="button"
        onclick={() => {
          regenerateDialogOpen = false;
          copied = false;
        }}>
        Cancel
      </Button>
      <Button variant="destructive" type="submit">Yes, I'm sure</Button>
    </form>
  </DialogContent>
</Dialog>
