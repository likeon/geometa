<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import type { InsertLevelsSchema } from './+page.server';
  import type { PageData } from './$types';
  import { Alert, Button, Input, Label, Modal } from 'flowbite-svelte';
  import Icon from '@iconify/svelte';

  interface Props {
    data: SuperValidated<Infer<InsertLevelsSchema>>;
    isLevelModalOpen: boolean;
    mapGroupId: number;
    selectedLevel: PageData['group']['levels'][number] | null;
  }

  let { data, isLevelModalOpen = $bindable(), mapGroupId, selectedLevel }: Props = $props();
  const { form, errors, constraints, enhance } = superForm(data, {
    dataType: 'json',
    onResult({ result }) {
      if (result.type === 'success') {
        isLevelModalOpen = false;
      }
    }
  });

  $effect(() => {
    if (isLevelModalOpen) {
      $form.mapGroupId = mapGroupId;

      if (selectedLevel) {
        $form.id = selectedLevel.id;
        $form.name = selectedLevel.name;
      } else {
        $form.name = '';
        $form.id = undefined;
      }
    }
  });

  const confirmDelete = (event: { preventDefault: () => void }) => {
    if (!confirm('Are you sure you want to delete this level?')) {
      event.preventDefault();
    }
  };
</script>

<Modal bind:open={isLevelModalOpen}>
  <form action="?/updateLevel" class="flex flex-col space-y-6" method="post" use:enhance>
    <Input type="hidden" name="id" bind:value={$form.id} />
    <Input type="hidden" name="mapGroupId" bind:value={$form.mapGroupId} />
    <Label class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <span>Name</span>
        {#if selectedLevel?.id}
          <form action="?/deleteLevel" method="post" onsubmit={confirmDelete} class="inline-block">
            <input type="hidden" name="id" value={selectedLevel?.id} />
            <button
              type="submit"
              class="inline-flex items-center justify-center p-0 m-0 bg-transparent border-none"
              title="Delete">
              <Icon icon="ic:baseline-delete" width="1rem" height="1rem" color="gray" />
            </button>
          </form>
        {/if}
      </div>

      <Input
        type="text"
        name="name"
        aria-invalid={$errors.name ? 'true' : undefined}
        bind:value={$form.name}
        {...$constraints.name} />
      {#if $errors.name}
        <Alert color="red">{$errors.name}</Alert>
      {/if}
    </Label>
    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>
