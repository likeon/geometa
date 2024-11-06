<script lang="ts">
  import { Alert, Button, Input, Label, Modal, MultiSelect, TabItem, Tabs } from 'flowbite-svelte';
  import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
  import type { InsertMetasSchema, MapUploadSchema } from './+page.server';
  import type { PageData } from './$types';
  import MetaImages from '$routes/(admin)/dev/dash/groups/[id]/MetaImages.svelte';
  import Icon from '@iconify/svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  // Component default theme
  import 'carta-md/default.css';

  const carta = new Carta();

  let {
    isMetaModalOpen = $bindable(),
    selectedMeta,
    metaForm,
    levelChoices,
    groupId,
    imageUploadForm
  }: {
    isMetaModalOpen: boolean;
    selectedMeta: PageData['group']['metas'][number] | null;
    metaForm: SuperValidated<Infer<InsertMetasSchema>>;
    levelChoices: { value: number; name: string }[];
    groupId: number;
    imageUploadForm: SuperValidated<Infer<MapUploadSchema>>;
  } = $props();

  const { form, errors, constraints, enhance, isTainted } = superForm(metaForm, {
    dataType: 'json',
    onResult() {
      isMetaModalOpen = false;
    }
  });

  type MetaFormDataType = Infer<InsertMetasSchema>;
  let savedForm: MetaFormDataType | null = null;

  function fillForm(meta: PageData['group']['metas'][number] | null) {
    if (savedForm) {
      $form = savedForm;
      return;
    }
    if (meta) {
      form.update(
        ($form) => {
          $form.id = meta.id;
          $form.mapGroupId = meta.mapGroupId;
          $form.tagName = meta.tagName;
          $form.name = meta.name;
          $form.note = meta.note;
          $form.levels = meta.metaLevels.map((item) => item.levelId);
          return $form;
        },
        { taint: false }
      );
    } else {
      form.update(
        ($form) => {
          $form.id = undefined;
          $form.mapGroupId = groupId;
          $form.tagName = '';
          $form.name = '';
          $form.note = '';
          $form.levels = [];
          return $form;
        },
        { taint: false }
      );
    }
  }

  $effect(() => {
    if (isMetaModalOpen) {
      fillForm(selectedMeta);
    } else {
      savedForm = null;
    }
  });

  const confirmDelete = (event: { preventDefault: () => void }) => {
    if (!confirm('Are you sure you want to delete this meta?')) {
      event.preventDefault();
    }
  };
</script>

<Modal bind:open={isMetaModalOpen}>
  <Tabs contentClass="p-4 mt-4" tabStyle="underline">
    <TabItem open title="Info" on:click={() => fillForm(selectedMeta)}>
      <form action="?/updateMeta" class="flex flex-col space-y-6" method="post" use:enhance>
        <Input type="hidden" name="id" bind:value={$form.id} />
        <Input type="hidden" name="mapGroupId" bind:value={$form.mapGroupId} />
        <Label class="space-y-2">
          <span>Tag name</span>
          <Input
            type="text"
            name="tagName"
            aria-invalid={$errors.tagName ? 'true' : undefined}
            bind:value={$form.tagName}
            {...$constraints.tagName} />
          {#if $errors.tagName}
            <Alert color="red">{$errors.tagName}</Alert>
          {/if}
        </Label>
        <Label class="space-y-2">
          <span>Name</span>
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
        <Label class="space-y-2">
          <span>Note</span>
          <MarkdownEditor {carta} mode="tabs" theme="test" bind:value={$form.note} />
          {#if $errors.note}
            <Alert color="red">{$errors.note}</Alert>
          {/if}
        </Label>
        <Label>
          <span>Levels</span>
          <MultiSelect items={levelChoices} bind:value={$form.levels} size="lg" />
        </Label>
        <Button type="submit" class="w-full">Save</Button>
      </form>
    </TabItem>
    {#if selectedMeta?.id}
      <TabItem
        title="Images"
        on:click={() => {
          if (isTainted()) {
            savedForm = $form;
          }
        }}>
        <MetaImages data={imageUploadForm} {selectedMeta} />
      </TabItem>
      <form action="?/deleteMeta" method="post" onsubmit={confirmDelete}>
        <div class="items-center flex h-full">
          <input type="hidden" name="id" value={selectedMeta.id} />
          <button type="submit">
            <Icon icon="ic:baseline-delete" width="1rem" height="1rem" color="gray" />
          </button>
        </div>
      </form>
    {/if}
  </Tabs>
</Modal>

<style lang="postcss">
  :global(.carta-font-code) {
    font-family: '...', monospace;
    font-size: 1.1rem;
    caret-color: black;
  }

  :global(textarea.carta-font-code, div.carta-font-code) {
    line-height: 1.2rem;
    font-size: 0.9rem;
  }

  :global(.carta-active) {
    @apply mx-3;
  }

  :global(.carta-container) {
    @apply border-2;
  }

  :global(.markdown-body ul) {
    @apply list-disc ml-5;
  }

  :global(.markdown-body ol) {
    @apply list-decimal ml-5;
  }
</style>
