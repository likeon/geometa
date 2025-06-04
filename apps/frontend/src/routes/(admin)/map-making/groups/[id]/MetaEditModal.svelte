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
  import type {
    CopyMetaSchema,
    ImageUploadSchema,
    ImageOrderUpdateSchema,
    InsertMetasSchema
  } from './+page.server';
  import type { PageData } from './$types';
  import MetaImages from '$routes/(admin)/map-making/groups/[id]/MetaImages.svelte';
  import Icon from '@iconify/svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  // Component default theme
  import 'carta-md/default.css';
  import TooltipName from '$lib/components/TooltipName.svelte';

  const cartaMeta = new Carta();
  const cartaFooter = new Carta();

  let {
    isMetaModalOpen = $bindable(),
    selectedMeta,
    metaForm,
    levelChoices,
    groupId,
    imageUploadForm,
    mapGroupChoices,
    copyForm,
    imageOrderUpdateForm
  }: {
    isMetaModalOpen: boolean;
    selectedMeta: PageData['group']['metas'][number] | null;
    metaForm: SuperValidated<Infer<InsertMetasSchema>>;
    levelChoices: { value: number; name: string }[];
    groupId: number;
    imageUploadForm: SuperValidated<Infer<ImageUploadSchema>>;
    mapGroupChoices: { value: number; name: string }[];
    copyForm: SuperValidated<Infer<CopyMetaSchema>>;
    imageOrderUpdateForm: SuperValidated<Infer<ImageOrderUpdateSchema>>;
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

  function nullifyForm() {
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

  nullifyForm();

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
      nullifyForm();
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
  <Tabs contentClass="!pt-0 !mt-0" tabStyle="underline">
    <TabItem open title="Info" on:click={() => fillForm(selectedMeta)}>
      <form action="?/updateMeta" class="flex flex-col space-y-2" method="post" use:enhanceMeta>
        <Input type="hidden" name="id" bind:value={$formMeta.id} />
        <Input type="hidden" name="mapGroupId" bind:value={$formMeta.mapGroupId} />
        <Label>
          <TooltipName
            name="Tag"
            tooltipText="This meta will be displayed for locations that have this specific tag name.">
          </TooltipName>
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
        <Label>
          <TooltipName
            name="Name"
            tooltipText="This name will be displayed on the top of the note in the format: Country - Name.

          For example if Tag is 'Czechia-ArrowTypedDirectionSigns' and name is 'Arrow Signs' it will be displayed:

          Czechia - Arrow Signs
          ">
          </TooltipName>
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
        <Label>
          <TooltipName
            name="Note"
            tooltipText="This note is displayed in the meta info and uses a Markdown-style text editor.
          Click 'Preview' to see how it will look.">
          </TooltipName>
          <MarkdownEditor carta={cartaMeta} mode="tabs" theme="test" bind:value={$formMeta.note} />
          {#if $errorsMeta.note}
            <Alert color="red">{$errorsMeta.note}</Alert>
          {/if}
        </Label>
        <Label>
          <Label>
            <Checkbox bind:checked={$formMeta.noteFromPlonkit}>
              <TooltipName
                name="Note from plonkit"
                tooltipText="Check this box to automatically credit PlonkIt if you used descriptions or images from their site."
                colorClass="text-red-300 dark:text-red-900">
              </TooltipName>
            </Checkbox>
          </Label>
        </Label>
        {#if !$formMeta.noteFromPlonkit}
          <Label>
            <TooltipName
              name="Footer"
              tooltipText="This footer will appear below the meta note. If a footer is set for the map, this meta footer will still take priority and be displayed instead.">
            </TooltipName>
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
          <TooltipName
            name="Levels"
            tooltipText="You can assign levels to this meta, allowing you to later filter and include only metas with specific levels when adding a map.">
          </TooltipName>
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
        <MetaImages data={imageUploadForm} orderData={imageOrderUpdateForm} {selectedMeta} />
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
      <form action="?/deleteMetas" method="post" onsubmit={confirmDelete}>
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
