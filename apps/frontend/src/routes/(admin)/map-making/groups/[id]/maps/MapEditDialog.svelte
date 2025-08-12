<script lang="ts">
  import * as Form from '$lib/components/ui/form/index';
  import { Input } from '$lib/components/ui/input/index';
  import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import type { PageData } from './$types';
  import { Textarea } from '$lib/components/ui/textarea/index';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import * as RadioGroup from '$lib/components/ui/radio-group';
  import FilterManager from './FilterManager.svelte';
  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
  import { insertMapsSchema, type InsertMapsSchema } from '$lib/form-schema';
  import FormLabelWithTooltip from '$lib/components/FormLabelWithTooltip.svelte';
  import MultiSelect from '$lib/components/MultiSelect.svelte';

  let {
    isMapDialogOpen = $bindable(),
    mapForm,
    selectedMap,
    groupId,
    levelChoices,
    regionChoices,
    user
  }: {
    isMapDialogOpen: boolean;
    mapForm: SuperValidated<Infer<InsertMapsSchema>>;
    selectedMap: PageData['group']['maps'][number] | null;
    groupId: number;
    levelChoices: { value: number; name: string }[];
    regionChoices: { value: number; name: string }[];
    user: PageData['user'];
  } = $props();

  const formMap = superForm(mapForm, {
    validators: zodClient(insertMapsSchema),
    resetForm: true,
    dataType: 'json',
    onResult({ result }) {
      if (result.type === 'success') {
        isMapDialogOpen = false;
      }
    }
  });

  const { form: formMapData, enhance: enhanceMap, errors: errorsMap } = formMap;

  function nullifyForm() {
    formMapData.update(
      ($formMapData) => {
        $formMapData.id = undefined;
        $formMapData.mapGroupId = groupId;
        $formMapData.geoguessrId = '';
        $formMapData.name = '';
        $formMapData.footer = '';
        $formMapData.ordering = 0;
        $formMapData.description = '';
        $formMapData.isPublished = false;
        $formMapData.authors = '';
        $formMapData.autoUpdate = false;
        $formMapData.levels = [];
        $formMapData.regions = [];
        $formMapData.includeFilters = [];
        $formMapData.excludeFilters = [];
        $formMapData.difficulty = 0;
        $formMapData.isVerified = false;
        $formMapData.isShared = false;
        return $formMapData;
      },
      { taint: false }
    );
  }

  function fillForm(map: PageData['group']['maps'][number] | null) {
    if (map) {
      formMapData.update(
        ($formMapData) => {
          $formMapData.id = map.id;
          $formMapData.mapGroupId = map.mapGroupId;
          $formMapData.geoguessrId = map.geoguessrId;
          $formMapData.name = map.name;
          $formMapData.footer = map.footer;
          $formMapData.ordering = map.ordering;
          $formMapData.description = map.description;
          $formMapData.isPublished = map.isPublished;
          $formMapData.authors = map.authors;
          $formMapData.autoUpdate = map.autoUpdate;
          $formMapData.levels = map.mapLevels.map((item) => item.levelId);
          $formMapData.regions = map.mapRegions.map((item) => item.regionId);
          $formMapData.difficulty = map.difficulty;
          $formMapData.isVerified = map.isVerified;
          $formMapData.isShared = map.isShared;
          $formMapData.includeFilters = map.filters
            .filter((item) => item.isExclude == false)
            .map((item) => item.tagLike as string);
          $formMapData.excludeFilters = map.filters
            .filter((item) => item.isExclude == true)
            .map((item) => item.tagLike as string);
          return $formMapData;
        },
        { taint: false }
      );
    } else {
      nullifyForm();
    }
  }
  $effect(() => {
    if (isMapDialogOpen) {
      fillForm(selectedMap);
      errorsMap.set({});
    }
  });

  let includeFilterInput = $state('');
  let excludeFilterInput = $state('');

  let difficultyString = $derived($formMapData.difficulty.toString());

  // And update the form when RadioGroup changes
  function handleDifficultyChange(value: string) {
    $formMapData.difficulty = parseInt(value);
  }
</script>

<Dialog.Root bind:open={isMapDialogOpen}>
  <Dialog.Content class="sm:max-w-3xl w-full">
    <form method="POST" use:enhanceMap action="?/updateMap">
      <Input type="hidden" name="id" bind:value={$formMapData.id} />
      <Input type="hidden" name="mapGroupId" bind:value={$formMapData.mapGroupId} />

      <Form.Field form={formMap} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Name"
              tooltipContent="The name that will appear on the map list page if your map is published by the admin team." />
            <Input {...props} bind:value={$formMapData.name} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      {#if user.isSuperadmin}
        <Form.Field form={formMap} name="ordering">
          <Form.Control>
            {#snippet children({ props })}
              <FormLabelWithTooltip label="Ordering" tooltipContent="" />
              <Input type="number" {...props} bind:value={$formMapData.ordering} />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
      {/if}

      <Form.Field form={formMap} name="geoguessrId">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Geoguessr ID"
              tooltipContent="To find the Map ID, open the GeoGuessr map page and check the URL.
    The ID is the long string of letters and numbers after /maps/.

    Example:
    https://www.geoguessr.com/maps/66fd7c30b34ca9145ec96a6a

    → The Map ID is 66fd7c30b34ca9145ec96a6a" />
            <Input {...props} bind:value={$formMapData.geoguessrId} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={formMap} name="description">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Description"
              tooltipContent="Description of the map that will appear on the map list page if your map is published by the admin team." />
            <Textarea rows={6} {...props} bind:value={$formMapData.description} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={formMap} name="footer">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Footer"
              tooltipContent="This footer will appear below the meta note. However, if a footer is already set for the meta itself or if the meta is marked as Plonkit, that footer will take priority and be displayed instead." />
            <MarkdownEditor
              bind:value={$formMapData.footer}
              height="120px"
              {...props} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={formMap} name="authors">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Author(s)"
              tooltipContent="Author(s) of the map that will appear on the map list page if your map is published by the admin team." />
            <Input {...props} bind:value={$formMapData.authors} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field
        form={formMap}
        name="isShared"
        class="flex flex-row items-start space-x-1 space-y-0 mb-2">
        <Form.Control>
          {#snippet children({ props })}
            <Checkbox {...props} bind:checked={$formMapData.isShared} />
            <div class="space-y-1 leading-none">
              <FormLabelWithTooltip
                label="Shared metas"
                tooltipContent="If you enable sharing metas, people will be able select metas from your map to use in their own personal maps!" />
            </div>
          {/snippet}
        </Form.Control>
      </Form.Field>

      {#if user.isSuperadmin || user.isTrusted}
        <div class="flex items-center space-x-4">
          <Form.Field
            form={formMap}
            name="isPublished"
            class="flex flex-row items-start space-x-1 space-y-0">
            <Form.Control>
              {#snippet children({ props })}
                <Checkbox {...props} bind:checked={$formMapData.isPublished} />
                <div class="space-y-1 leading-none">
                  <FormLabelWithTooltip label="Publish" tooltipContent="" />
                </div>
              {/snippet}
            </Form.Control>
          </Form.Field>

          {#if user.isSuperadmin}
            <Form.Field
              form={formMap}
              name="isVerified"
              class="flex flex-row items-start space-x-1 space-y-0">
              <Form.Control>
                {#snippet children({ props })}
                  <Checkbox {...props} bind:checked={$formMapData.isVerified} />
                  <div class="space-y-1 leading-none">
                    <FormLabelWithTooltip label="Verified" tooltipContent="" />
                  </div>
                {/snippet}
              </Form.Control>
            </Form.Field>

            <Form.Field
              form={formMap}
              name="autoUpdate"
              class="flex flex-row items-start space-x-1 space-y-0">
              <Form.Control>
                {#snippet children({ props })}
                  <Checkbox {...props} bind:checked={$formMapData.autoUpdate} />
                  <div class="space-y-1 leading-none">
                    <FormLabelWithTooltip label="Auto Update" tooltipContent="" />
                  </div>
                {/snippet}
              </Form.Control>
            </Form.Field>
          {/if}
        </div>
      {/if}

      <Form.Field form={formMap} name="levels">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Levels"
              tooltipContent="Use this to include only metas that belong to specific levels you have assigned to them." />
            <MultiSelect
              items={levelChoices}
              bind:selectedValues={$formMapData.levels}
              name={props.name} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={formMap} name="includeFilters">
        <Form.Control>
          <FormLabelWithTooltip
            label="Include Tags"
            tooltipContent="Use this to include only specific metas based on their tag name. For example, to include only tags starting with 'Czechia-', enter 'Czechia-%'.

          Remember to save after you are done adding/removing filters." />
          <FilterManager
            bind:filters={$formMapData.includeFilters}
            bind:filterInput={includeFilterInput}
            oppositeFilters={$formMapData.excludeFilters} />
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={formMap} name="excludeFilters">
        <Form.Control>
          <FormLabelWithTooltip
            label="Exclude Tags"
            tooltipContent="Use this to exclude specific metas based on their tag name. For example, to exclude tags starting with 'Czechia-', enter 'Czechia-%'.

          Remember to save after you are done adding/removing filters." />
          <FilterManager
            bind:filters={$formMapData.excludeFilters}
            bind:filterInput={excludeFilterInput}
            oppositeFilters={$formMapData.includeFilters} />
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={formMap} name="regions">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Regions"
              tooltipContent="Select the regions where your map will appear if it is published by the admin team." />
            <MultiSelect
              items={regionChoices}
              bind:selectedValues={$formMapData.regions}
              name={props.name} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={formMap} name="difficulty">
        <Form.Control>
          {#snippet children({ props })}
            <FormLabelWithTooltip
              label="Difficulty"
              tooltipContent="Select the difficulty level that will be displayed on your map if it is published by the admin team." />
            <RadioGroup.Root
              name={props.name}
              bind:value={difficultyString}
              onValueChange={handleDifficultyChange}
              class="flex border rounded-lg divide-x">
              <div class="flex items-center space-x-2 p-3 flex-1">
                <RadioGroup.Item value="1" id="beginner" />
                <label for="beginner">Beginner</label>
              </div>
              <div class="flex items-center space-x-2 p-3 flex-1">
                <RadioGroup.Item value="2" id="intermediate" />
                <label for="intermediate">Intermediate</label>
              </div>
              <div class="flex items-center space-x-2 p-3 flex-1">
                <RadioGroup.Item value="3" id="advanced" />
                <label for="advanced">Advanced</label>
              </div>
            </RadioGroup.Root>
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Button>Save map</Form.Button>
    </form>
  </Dialog.Content>
</Dialog.Root>
