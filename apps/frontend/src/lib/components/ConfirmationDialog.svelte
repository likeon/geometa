<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import Icon from '@iconify/svelte';

  interface Props {
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'default';
    items?: Array<{
      id: string | number;
      name: string;
      count?: number;
      detail?: string;
    }>;
    showWarning?: boolean;
    warningTitle?: string;
    warningDescription?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    open = $bindable(),
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'destructive',
    items = [],
    showWarning = true,
    warningTitle = 'This is a permanent deletion',
    warningDescription = 'All associated data will be lost.',
    onConfirm,
    onCancel
  }: Props = $props();

  function handleConfirm() {
    onConfirm();
    open = false;
  }

  function handleCancel() {
    onCancel();
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[600px]">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>
        {description}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      {#if showWarning}
        <div class="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <div class="flex items-start space-x-2">
            <Icon
              icon="material-symbols:warning-rounded"
              width="1.25rem"
              height="1.25rem"
              class="text-destructive mt-0.5" />
            <div class="space-y-1">
              <p class="text-sm font-medium text-destructive">{warningTitle}</p>
              <p class="text-sm text-muted-foreground">
                {warningDescription}
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if items.length > 0}
        <div class="space-y-2">
          <p class="text-sm font-medium">Items to be affected:</p>
          <div class="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-1">
            {#each items as item (item.id)}
              <div class="flex items-center justify-between text-sm">
                <span class="font-mono">{item.name}</span>
                <div class="flex flex-col items-end text-xs text-muted-foreground">
                  {#if item.count !== undefined}
                    <span>{item.count} location{item.count !== 1 ? 's' : ''}</span>
                  {/if}
                  {#if item.detail}
                    <span>{item.detail}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="rounded-md bg-muted p-3">
          <p class="text-sm text-muted-foreground">
            <strong>Total:</strong>
            {items.length} item{items.length !== 1 ? 's' : ''} will be affected
          </p>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button type="button" variant="outline" onclick={handleCancel}>
        {cancelText}
      </Button>
      <Button type="button" {variant} onclick={handleConfirm}>
        {confirmText}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>