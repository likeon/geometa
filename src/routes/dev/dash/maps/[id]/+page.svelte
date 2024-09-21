<script lang="ts">
  import { Button, Checkbox, Input, Label, Modal, Textarea, Toggle } from 'flowbite-svelte';
  import { superForm } from 'sveltekit-superforms';

  export let data;
  type MetaType = typeof data.map.metas[number];
  let selectedMeta: undefined | MetaType;
  let isModalOpen = false;
  const { form, errors, constraints, message } = superForm(data.form);

  function selectMeta(meta: MetaType) {
    selectedMeta = meta;
    $form.id = meta.id;
    $form.type = meta.type;
    $form.note = meta.note;
    $form.noteFromPlonkit = meta.noteFromPlonkit;
    $form.hasImage = meta.hasImage;
    isModalOpen = true;
  }

</script>

<table class="min-w-full divide-y divide-gray-300">
  <thead class="bg-gray-50">
  <tr>
    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Type</th>
    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Note</th>
    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Note from Plonkit?</th>
    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Has image?</th>
  </tr>
  </thead>
  <tbody>
  {#each data.map.metas as meta (meta.id) }
    <tr role="link" on:click={() => selectMeta(meta)}>
      <td>{meta.type}</td>
      <td>{meta.note}</td>
      <td>{meta.noteFromPlonkit}</td>
      <td>{meta.hasImage}</td>
    </tr>
  {/each}
  </tbody>
</table>

<Modal bind:open={isModalOpen}>
  <form class="flex flex-col space-y-6" method="post">
    <Label class="space-y-2">
      <span>Type</span>
      <Input type="text" name="url" aria-invalid={$errors.type ? 'true' : undefined} bind:value={$form.type}
             {...$constraints.type} />
      {#if $errors.type}
        <Alert color="red">{$errors.type}</Alert>
      {/if}
    </Label>
    <Label class="space-y-2">
      <span>Note</span>
      <Textarea rows="6" note="text" name="url" aria-invalid={$errors.note ? 'true' : undefined}
                bind:value={$form.note}
                {...$constraints.note} />
      {#if $errors.note}
        <Alert color="red">{$errors.note}</Alert>
      {/if}
    </Label>
    <Toggle checked={$form.noteFromPlonkit}>Note from Plonkit</Toggle>
    <Toggle checked={$form.hasImage}>Has image</Toggle>
    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>
