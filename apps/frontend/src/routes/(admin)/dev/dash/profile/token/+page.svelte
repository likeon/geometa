<script lang="ts">
  import Icon from '@iconify/svelte';
  import { Button, Heading, Modal, Alert, P, Kbd, Tooltip } from 'flowbite-svelte'; // Added Tooltip
  import { superForm } from 'sveltekit-superforms';

  let { data } = $props();

  let regenerateModalOpen = $state(false);
  let copied = $state(false);

  const {
    form: regenerateApiTokenFormStore,
    errors: regenerateApiTokenErrors,
    enhance: regenerateApiTokenEnhance,
    message: regenerateApiTokenMessage
  } = superForm(data.regenerateApiTokenForm, {
    resetForm: false,
    onUpdated: ({ form }) => {
      if (form.valid && form.data.newRawToken && form.message?.includes('generated successfully')) {
        regenerateModalOpen = false;
        copied = false;
      }
    }
  });

  let showNewToken = $derived(
    $regenerateApiTokenFormStore.newRawToken &&
      $regenerateApiTokenMessage?.includes('generated successfully')
  );

  function openRegenerateModal() {
    if ($regenerateApiTokenFormStore.newRawToken) {
      $regenerateApiTokenFormStore.newRawToken = undefined;
    }
    if ($regenerateApiTokenMessage) {
      $regenerateApiTokenMessage = undefined;
    }
    copied = false;
    regenerateModalOpen = true;
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
  }
</script>

<div class="p-4 md:p-8">
  <Heading tag="h2" class="mb-6">API Token Management</Heading>

  {#if $regenerateApiTokenMessage && !showNewToken}
    <Alert
      color={$regenerateApiTokenErrors && Object.keys($regenerateApiTokenErrors).length > 0
        ? 'red'
        : 'green'}
      class="mb-4"
      dismissable>
      {$regenerateApiTokenMessage}
    </Alert>
  {/if}

  {#if showNewToken && $regenerateApiTokenFormStore.newRawToken}
    <Alert color="blue" class="mb-6" dismissable on:close={dismissNewTokenAlert}>
      <span class="font-medium">{$regenerateApiTokenMessage || 'Your New API Token:'}</span>
      <div class="mt-2 flex items-center space-x-2">
        <Kbd
          class="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 flex-grow break-all">
          {$regenerateApiTokenFormStore.newRawToken}
        </Kbd>
        <Button
          color="alternative"
          size="xs"
          class="p-2"
          on:click={copyTokenToClipboard}
          aria-label="Copy API token">
          {#if copied}
            <Icon icon="mdi:check" class="w-4 h-4 text-green-500" />
          {:else}
            <Icon icon="mdi:content-copy" class="w-4 h-4" />
          {/if}
        </Button>
        <Tooltip triggeredBy="[aria-label='Copy API token']"
          >{copied ? 'Copied!' : 'Copy to clipboard'}</Tooltip>
      </div>
      <p class="text-xs mt-2 text-gray-700 dark:text-gray-300">
        Please copy this token. It will not be shown again after you navigate away or close this
        message.
      </p>
    </Alert>
  {/if}

  <div class="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 w-full max-w-lg">
    {#if data.hasApiToken}
      <Heading tag="h5" class="mb-2">Manage Your API Token</Heading>
      <P class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        You currently have an active API token. You can invalidate your current token and generate a
        new one. This action cannot be undone, and your old token will stop working immediately.
      </P>
      <Button color="yellow" on:click={openRegenerateModal}>
        <Icon icon="mdi:key-change" class="mr-2 h-5 w-5" />
        Invalidate and Regenerate Token
      </Button>
    {:else}
      <Heading tag="h5" class="mb-2">Generate API Token</Heading>
      <P class="mb-3 text-gray-600 dark:text-gray-400">
        Generate an API token to interact with our services programmatically. Keep your token secure
        and do not share it.
      </P>
      <form action="?/regenerateApiToken" method="post" use:regenerateApiTokenEnhance>
        <Button type="submit" color="green">
          <Icon icon="mdi:key-plus" class="mr-2 h-5 w-5" />
          Generate API Token
        </Button>
      </form>
    {/if}
  </div>
</div>

<Modal
  title="Confirm Token Regeneration"
  bind:open={regenerateModalOpen}
  autoclose={false}
  class="w-full">
  <div class="text-center p-4 md:p-5">
    <Icon
      icon="mdi:alert-octagon-outline"
      class="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-200" />
    <Heading tag="h3" class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      Are you sure?
    </Heading>
    <P class="mb-5 text-sm text-gray-500 dark:text-gray-400">
      If you have an existing token, it will be invalidated immediately and a new one will be
      generated. If you don't have a token, a new one will be generated. This action cannot be
      undone.
    </P>
    <form
      action="?/regenerateApiToken"
      method="post"
      use:regenerateApiTokenEnhance
      class="flex justify-center gap-4">
      <Button color="red" type="submit">Yes, I'm sure</Button>
      <Button
        color="alternative"
        type="button"
        on:click={() => {
          regenerateModalOpen = false;
          copied = false;
        }}>
        No, cancel
      </Button>
    </form>
  </div>
</Modal>
