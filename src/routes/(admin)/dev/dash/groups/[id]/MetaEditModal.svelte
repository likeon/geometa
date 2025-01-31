<script lang="ts">
  import {
    Alert,
    Button,
    Checkbox,
    Input,
    Label,
    Modal,
    MultiSelect,
    Select,
    TabItem,
    Tabs
  } from 'flowbite-svelte';
  import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
  import type { CopyMetaSchema, ImageUploadSchema, InsertMetasSchema } from './+page.server';
  import type { PageData } from './$types';
  import MetaImages from '$routes/(admin)/dev/dash/groups/[id]/MetaImages.svelte';
  import Icon from '@iconify/svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  // Component default theme
  import 'carta-md/default.css';

  const cartaMeta = new Carta();
  const cartaFooter = new Carta();

  let {
    isMetaModalOpen = $bindable(),
    selectedMeta,
    metaForm,
    levelChoices,
    groupId,
    imageUploadForm,
    user,
    mapGroupChoices,
    copyForm
  }: {
    isMetaModalOpen: boolean;
    selectedMeta: PageData['group']['metas'][number] | null;
    metaForm: SuperValidated<Infer<InsertMetasSchema>>;
    levelChoices: { value: number; name: string }[];
    groupId: number;
    imageUploadForm: SuperValidated<Infer<ImageUploadSchema>>;
    user: PageData['user'];
    mapGroupChoices: { value: number; name: string }[];
    copyForm: SuperValidated<Infer<CopyMetaSchema>>;
  } = $props();

  const {
    form: formMeta,
    errors: errorsMeta,
    constraints: constraintsMeta,
    enhance: enhanceMeta,
    isTainted: isTaintedMeta
  } = superForm(metaForm, {
    dataType: 'json',
    onResult() {
      isMetaModalOpen = false;
    }
  });

  const { form: formCopy, enhance: enhanceCopy } = superForm(copyForm, {
    onResult() {
      isMetaModalOpen = false;
    }
  });

  type MetaFormDataType = Infer<InsertMetasSchema>;
  let savedForm: MetaFormDataType | null = null;

  function fillForm(meta: PageData['group']['metas'][number] | null) {
    if (savedForm) {
      $formMeta = savedForm;
      return;
    }
    if (meta) {
      $formCopy.metaId = meta.id;
      formMeta.update(
        ($formMeta) => {
          $formMeta.id = meta.id;
          $formMeta.mapGroupId = meta.mapGroupId;
          $formMeta.tagName = meta.tagName;
          $formMeta.name = meta.name;
          $formMeta.note = meta.note;
          $formMeta.footer = meta.footer;
          $formMeta.levels = meta.metaLevels.map((item) => item.levelId);
          $formMeta.noteFromPlonkit = meta.noteFromPlonkit;
          return $formMeta;
        },
        { taint: false }
      );
    } else {
      formMeta.update(
        ($formMeta) => {
          $formMeta.id = undefined;
          $formMeta.mapGroupId = groupId;
          $formMeta.tagName = '';
          $formMeta.name = '';
          $formMeta.note = '';
          $formMeta.footer = '';
          $formMeta.levels = [];
          $formMeta.noteFromPlonkit = false;
          return $formMeta;
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

  const confirmCopy = (event: { preventDefault: () => void }) => {
    if (!confirm('Are you sure you want to copy this meta?')) {
      event.preventDefault();
    }
  };
</script>

<Modal bind:open={isMetaModalOpen}>
  <Tabs contentClass="p-4 mt-4" tabStyle="underline">
    <TabItem open title="Info" on:click={() => fillForm(selectedMeta)}>
      <form action="?/updateMeta" class="flex flex-col space-y-6" method="post" use:enhanceMeta>
        <Input type="hidden" name="id" bind:value={$formMeta.id} />
        <Input type="hidden" name="mapGroupId" bind:value={$formMeta.mapGroupId} />
        <Label class="space-y-2">
          <span>Tag name</span>
          <Input
            type="text"
            name="tagName"
            aria-invalid={$errorsMeta.tagName ? 'true' : undefined}
            bind:value={$formMeta.tagName}
            {...$constraintsMeta.tagName} />
          {#if $errorsMeta.tagName}
            <Alert color="red">{$errorsMeta.tagName}</Alert>
          {/if}
        </Label>
        <Label class="space-y-2">
          <span>Name</span>
          <Input
            type="text"
            name="name"
            aria-invalid={$errorsMeta.name ? 'true' : undefined}
            bind:value={$formMeta.name}
            {...$constraintsMeta.name} />
          {#if $errorsMeta.name}
            <Alert color="red">{$errorsMeta.name}</Alert>
          {/if}
        </Label>
        <Label class="space-y-2">
          <span>Note</span>
          <MarkdownEditor carta={cartaMeta} mode="tabs" theme="test" bind:value={$formMeta.note} />
          {#if $errorsMeta.note}
            <Alert color="red">{$errorsMeta.note}</Alert>
          {/if}
        </Label>
        <Label class="space-y-2">
          <Label>
            <Checkbox bind:checked={$formMeta.noteFromPlonkit}>Note from plonkit</Checkbox>
          </Label>
        </Label>
        {#if !$formMeta.noteFromPlonkit}
          <Label class="space-y-2">
            <span>Footer</span>
            <MarkdownEditor
              carta={cartaFooter}
              mode="tabs"
              theme="test"
              bind:value={$formMeta.footer} />
            {#if $errorsMeta.footer}
              <Alert color="red">{$errorsMeta.footer}</Alert>
            {/if}
          </Label>
        {/if}
        <Label>
          <span>Levels</span>
          <MultiSelect items={levelChoices} bind:value={$formMeta.levels} size="lg" />
        </Label>
        <Button type="submit" class="w-full">Save</Button>
      </form>
    </TabItem>
    {#if selectedMeta?.id}
      <TabItem
        title="Images"
        on:click={() => {
          if (isTaintedMeta()) {
            savedForm = $formMeta;
          }
        }}>
        <MetaImages data={imageUploadForm} {selectedMeta} />
      </TabItem>
      <TabItem
        title="Copy"
        on:click={() => {
          if (isTaintedMeta()) {
            savedForm = $formMeta;
          }
        }}>
        <form action="?/copyMetaTo" method="post" onsubmit={confirmCopy} use:enhanceCopy>
          <div class="flex items-center gap-4">
            <Input type="hidden" name="metaId" bind:value={$formCopy.metaId} />
            <Label class="flex-1">
              <span class="block mb-2 text-sm font-medium">Copy this meta to:</span>
              <Select
                name="mapGroupIdToCopy"
                items={mapGroupChoices}
                size="lg"
                class="w-full"
                bind:value={$formCopy.mapGroupIdToCopy} />
            </Label>
            <button type="submit" class="p-2">
              <Icon icon="solar:copy-bold" width="1rem" height="1rem" color="gray" />
            </button>
          </div>
        </form>
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
