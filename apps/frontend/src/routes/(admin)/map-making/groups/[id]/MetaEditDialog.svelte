<script lang="ts">
  import * as Form from '$lib/components/ui/form/index';
  import { Input } from '$lib/components/ui/input/index';
  import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import type { PageData } from './$types';
  import * as Tabs from '$lib/components/ui/tabs/index';
  import { Carta, MarkdownEditor } from 'carta-md';
  import 'carta-md/default.css';
  import { insertMetasSchema, type InsertMetasSchema } from '$lib/form-schema';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import FormLabelWithTooltip from '$lib/components/FormLabelWithTooltip.svelte';
  import MetaImages from '$routes/(admin)/map-making/groups/[id]/MetaImages.svelte';
  import MultiSelect from '$lib/components/MultiSelect.svelte';
  import type {
    ImageOrderUpdateSchema,
    ImageUploadSchema
  } from '$routes/(admin)/map-making/groups/[id]/+page.server';
  import { Button } from '$lib/components/ui/button/index';
  import Icon from '@iconify/svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';

  let {
    isMetaDialogOpen = $bindable(),
    metaForm,
    levelChoices,
    groupId,
    selectedMeta,
    imageUploadForm,
    imageOrderUpdateForm,
    selectedIds = [],
    selectedMetaId = $bindable()
  }: {
    isMetaDialogOpen: boolean;
    metaForm: SuperValidated<Infer<InsertMetasSchema>>;
    levelChoices: { value: number; name: string }[];
    groupId: number;
    selectedMeta: PageData['group']['metas'][number] | null;
    imageUploadForm: SuperValidated<Infer<ImageUploadSchema>>;
    imageOrderUpdateForm: SuperValidated<Infer<ImageOrderUpdateSchema>>;
    selectedIds?: number[];
    selectedMetaId?: number;
  } = $props();

  const formMeta = superForm(metaForm, {
    validators: zodClient(insertMetasSchema),
    resetForm: true,
    dataType: 'json',
    onResult({ result }) {
      if (result.type === 'success') {
        isMetaDialogOpen = false;
      }
    }
  });

  const { form: formMetaData, enhance: enhanceMeta, isTainted: isTaintedMeta } = formMeta;
  const cartaMeta = new Carta();
  const cartaFooter = new Carta();
  type MetaFormDataType = Infer<InsertMetasSchema>;
  let savedForm: MetaFormDataType | null = null;

  const currentIndex = $derived(selectedIds.findIndex((id) => id === selectedMetaId));
  const canNavigate = $derived(selectedIds.length > 1 && selectedMetaId !== -1);

  function navigatePrevious() {
    if (canNavigate) {
      const prevIndex = currentIndex === 0 ? selectedIds.length - 1 : currentIndex - 1;
      selectedMetaId = selectedIds[prevIndex];
    }
  }

  function navigateNext() {
    if (canNavigate) {
      const nextIndex = currentIndex === selectedIds.length - 1 ? 0 : currentIndex + 1;
      selectedMetaId = selectedIds[nextIndex];
    }
  }

  function nullifyForm() {
    formMetaData.update(
      ($formMetaData) => {
        $formMetaData.id = undefined;
        $formMetaData.mapGroupId = groupId;
        $formMetaData.tagName = '';
        $formMetaData.name = '';
        $formMetaData.note = '';
        $formMetaData.footer = '';
        $formMetaData.levels = [];
        $formMetaData.noteFromPlonkit = false;
        return $formMetaData;
      },
      { taint: false }
    );
  }

  function fillForm(meta: PageData['group']['metas'][number] | null) {
    if (savedForm) {
      $formMetaData = savedForm;
      return;
    }
    if (meta) {
      formMetaData.update(
        ($formMetaData) => {
          $formMetaData.id = meta.id;
          $formMetaData.mapGroupId = meta.mapGroupId;
          $formMetaData.tagName = meta.tagName;
          $formMetaData.name = meta.name;
          $formMetaData.note = meta.note;
          $formMetaData.footer = meta.footer;
          $formMetaData.levels = meta.metaLevels.map((item) => item.levelId);
          $formMetaData.noteFromPlonkit = meta.noteFromPlonkit;
          return $formMetaData;
        },
        { taint: false }
      );
    } else {
      nullifyForm();
    }
  }

  $effect(() => {
    if (isMetaDialogOpen) {
      fillForm(selectedMeta);
    }
  });
</script>

<Dialog.Root bind:open={isMetaDialogOpen}>
  <Dialog.Content class="sm:max-w-3xl w-full max-h-[500px]:max-w-[90vw] max-h-[400px]:max-w-[95vw]">
    <Dialog.Header class="flex flex-row items-center space-y-0 pr-6">
      <Dialog.Title class="flex-1">
        {selectedMeta ? `Edit Meta: ${selectedMeta.tagName}` : 'Add Meta'}
      </Dialog.Title>
      {#if canNavigate}
        <div class="flex items-center gap-2 mr-4">
          <Button variant="outline" size="sm" onclick={navigatePrevious}>
            <Icon icon="material-symbols:arrow-back" width="1rem" height="1rem" />
          </Button>
          <span class="text-sm text-muted-foreground">
            {currentIndex + 1} / {selectedIds.length}
          </span>
          <Button variant="outline" size="sm" onclick={navigateNext}>
            <Icon icon="material-symbols:arrow-forward" width="1rem" height="1rem" />
          </Button>
        </div>
      {/if}
    </Dialog.Header>
    <Tabs.Root value="info" class="w-full max-w-3xl">
      <Tabs.List>
        <Tabs.Trigger value="info">Info</Tabs.Trigger>
        {#if selectedMeta?.id}
          <Tabs.Trigger
            value="images"
            onclick={() => {
              if (isTaintedMeta()) {
                savedForm = $formMetaData;
              }
            }}>Images</Tabs.Trigger>
        {:else}
          <Tooltip
            content="Meta must be saved first before adding images"
            side="right"
            delayDuration={100}
            disableCloseOnTriggerClick={true}>
            <Tabs.Trigger value="images" disabled class="!pointer-events-auto cursor-not-allowed">
              Images
            </Tabs.Trigger>
          </Tooltip>
        {/if}
      </Tabs.List>
      <Tabs.Content value="info" class="h-[68vh] max-h-[650px] overflow-y-auto flex-none">
        <form method="POST" use:enhanceMeta action="?/updateMeta">
          <Input type="hidden" name="id" bind:value={$formMetaData.id} />
          <Input type="hidden" name="mapGroupId" bind:value={$formMetaData.mapGroupId} />
          <Form.Field form={formMeta} name="tagName">
            <Form.Control>
              {#snippet children({ props })}
                <FormLabelWithTooltip
                  label="Tag"
                  tooltipContent="  This meta will be displayed for locations that have this specific tag name." />
                <Input {...props} bind:value={$formMetaData.tagName} />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
          <Form.Field form={formMeta} name="name">
            <Form.Control>
              {#snippet children({ props })}
                <FormLabelWithTooltip
                  label="Name"
                  tooltipContent="This name will be displayed on the top of the note in the format: Country - Name.

For example if Tag is 'Czechia-ArrowTypedDirectionSigns' and name is 'Arrow Signs' it will be displayed:

Czechia - Arrow Signs" />
                <Input {...props} bind:value={$formMetaData.name} />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
          <Form.Field form={formMeta} name="note">
            <Form.Control>
              {#snippet children({ props })}
                <FormLabelWithTooltip
                  label="Note"
                  tooltipContent="This note is displayed in the meta info and uses a Markdown-style text editor.
          Click 'Preview' to see how it will look." />
                <div class="carta-note-editor">
                  <MarkdownEditor
                    carta={cartaMeta}
                    mode="tabs"
                    theme="test"
                    bind:value={$formMetaData.note}
                    {...props} />
                </div>
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
          <Form.Field
            form={formMeta}
            name="noteFromPlonkit"
            class="flex flex-row items-start space-x-1 space-y-0 mb-2">
            <Form.Control>
              {#snippet children({ props })}
                <Checkbox {...props} bind:checked={$formMetaData.noteFromPlonkit} />
                <div class="space-y-1 leading-none">
                  <FormLabelWithTooltip
                    label="Note from Plonkit"
                    tooltipContent="Check this box to automatically credit PlonkIt if you used descriptions or images from their site." />
                </div>
              {/snippet}
            </Form.Control>
          </Form.Field>

          <Form.Field form={formMeta} name="footer">
            <Form.Control>
              {#snippet children({ props })}
                <FormLabelWithTooltip
                  label="Footer"
                  tooltipContent="This footer will appear below the meta note. If a footer is set for the map, this meta footer will still take priority and be displayed instead." />
                <div class="carta-footer-editor">
                  <MarkdownEditor
                    carta={cartaFooter}
                    mode="tabs"
                    theme="test"
                    bind:value={$formMetaData.footer}
                    {...props} />
                </div>
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
          <Form.Field form={formMeta} name="levels">
            <Form.Control>
              {#snippet children({ props })}
                <FormLabelWithTooltip
                  label="Levels"
                  tooltipContent="You can assign levels to this meta, allowing you to later filter and include only metas with specific levels when adding a map." />
                <MultiSelect
                  items={levelChoices}
                  bind:selectedValues={$formMetaData.levels}
                  name={props.name} />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
          <Form.Button>Save meta</Form.Button>
        </form>
      </Tabs.Content>
      {#if selectedMeta}
        <Tabs.Content value="images" class="h-[68vh] max-h-[650px] overflow-y-auto flex-none">
          <MetaImages {selectedMeta} {imageUploadForm} orderData={imageOrderUpdateForm}
          ></MetaImages>
        </Tabs.Content>
      {/if}
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.carta-note-editor .carta-input),
  :global(.carta-note-editor .carta-renderer) {
    height: 17vh !important;
    max-height: 160px !important;
    overflow-y: auto !important;
  }

  :global(.carta-footer-editor .carta-input),
  :global(.carta-footer-editor .carta-renderer) {
    height: 5.6vh !important;
    max-height: 50px !important;
    overflow-y: auto !important;
  }

  /* Minimum heights for very small screens */
  @media (max-height: 600px) {
    :global(.carta-note-editor .carta-input),
    :global(.carta-note-editor .carta-renderer) {
      height: 120px !important;
    }

    :global(.carta-footer-editor .carta-input),
    :global(.carta-footer-editor .carta-renderer) {
      height: 40px !important;
    }
  }

  /* Maximum heights for very large screens */
  @media (min-height: 1200px) {
    :global(.carta-note-editor .carta-input),
    :global(.carta-note-editor .carta-renderer) {
      height: 200px !important;
    }

    :global(.carta-footer-editor .carta-input),
    :global(.carta-footer-editor .carta-renderer) {
      height: 60px !important;
    }
  }
</style>
