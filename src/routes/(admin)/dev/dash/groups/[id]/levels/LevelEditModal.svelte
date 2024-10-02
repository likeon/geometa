<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import type { InsertLevelsSchema } from './+page.server';
  import type { PageData } from './$types';
  import { Alert, Button, Input, Label, Modal } from 'flowbite-svelte';

  export let data: SuperValidated<Infer<InsertLevelsSchema>>;
  export let isLevelModalOpen: boolean;
  export let selectedLevel: PageData['group']['levels'][number] | null;
  export let groupId: number;

  const { form, errors, constraints, enhance } = superForm(data, {
    dataType: 'json',
    onResult() {
      isLevelModalOpen = false;
    }
  });

  $: if (selectedLevel) {
    $form.id = selectedLevel.id;
    $form.name = selectedLevel.name;
    $form.mapGroupId = selectedLevel.mapGroupId;
  } else {
    $form.id = undefined;
    $form.mapGroupId = groupId;
    $form.name = '';
  }
</script>

<Modal bind:open={isLevelModalOpen}>
  <form action="?/updateLevel" class="flex flex-col space-y-6" method="post" use:enhance>
    <Input type="hidden" name="id" bind:value={$form.id} />
    <Input type="hidden" name="mapGroupId" bind:value={$form.mapGroupId} />
    <Label class="space-y-2">
      <span>Name</span>
      <Input
        type="text"
        name="name"
        aria-invalid={$errors.name ? 'true' : undefined}
        bind:value={$form.name}
        {...$constraints.name}
      />
      {#if $errors.name}
        <Alert color="red">{$errors.name}</Alert>
      {/if}
    </Label>
    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>
