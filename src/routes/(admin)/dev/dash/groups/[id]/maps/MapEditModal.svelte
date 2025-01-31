<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import type { InsertMapsSchema } from './+page.server';
  import type { PageData } from './$types';
  import {
    Alert,
    Button,
    Input,
    Label,
    Modal,
    MultiSelect,
    Radio,
    Textarea
  } from 'flowbite-svelte';
  import Checkbox from 'flowbite-svelte/Checkbox.svelte';
  import FilterManager from './FilterManager.svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  import TooltipName from '$lib/components/TooltipName.svelte';

  interface Props {
    data: SuperValidated<Infer<InsertMapsSchema>>;
    isMapModalOpen: boolean;
    selectedMap: PageData['group']['maps'][number] | null;
    groupId: number;
    levelChoices: { value: number; name: string }[];
    regionChoices: { value: number; name: string }[];
    user: PageData['user'];
  }

  let {
    data,
    isMapModalOpen = $bindable(),
    selectedMap,
    groupId,
    levelChoices,
    regionChoices,
    user
  }: Props = $props();

  const { form, errors, constraints, enhance } = superForm(data, {
    dataType: 'json',
    onResult() {
      isMapModalOpen = false;
    }
  });

  const carta = new Carta();

  $effect(() => {
    if (isMapModalOpen) {
      if (selectedMap) {
        $form.geoguessrId = selectedMap.geoguessrId;
        $form.id = selectedMap.id;
        $form.mapGroupId = selectedMap.mapGroupId;
        $form.name = selectedMap.name;
        $form.footer = selectedMap.footer;
        $form.ordering = selectedMap.ordering;
        $form.description = selectedMap.description;
        $form.isPublished = selectedMap.isPublished;
        $form.isCommunity = selectedMap.isCommunity;
        $form.authors = selectedMap.authors;
        $form.autoUpdate = selectedMap.autoUpdate;
        $form.levels = selectedMap.mapLevels.map((item) => item.levelId);
        $form.regions = selectedMap.mapRegions.map((item) => item.regionId);
        $form.difficulty = selectedMap.difficulty;
        $form.isVerified = selectedMap.isVerified;
        $form.includeFilters = selectedMap.filters
          .filter((item) => item.isExclude == false)
          .map((item) => item.tagLike as string);
        $form.excludeFilters = selectedMap.filters
          .filter((item) => item.isExclude == true)
          .map((item) => item.tagLike as string);
      } else {
        $form.id = undefined;
        $form.mapGroupId = groupId;
        $form.geoguessrId = '';
        $form.name = '';
        $form.footer = '';
        $form.ordering = 0;
        $form.description = '';
        $form.isPublished = false;
        $form.isCommunity = false;
        $form.authors = '';
        $form.autoUpdate = false;
        $form.levels = [];
        $form.regions = [];
        $form.includeFilters = [];
        $form.excludeFilters = [];
        $form.difficulty = 0;
        $form.isVerified = false;
      }
    }
  });

  let includeFilterInput = $state('');

  let excludeFilterInput = $state('');
</script>

<Modal bind:open={isMapModalOpen}>
  <form action="?/updateMap" class="flex flex-col gap-2" method="post" use:enhance>
    <Input type="hidden" name="id" bind:value={$form.id} />
    <Input type="hidden" name="mapGroupId" bind:value={$form.mapGroupId} />
    <Label>
      <TooltipName
        name="Name"
        tooltipText="The name that will appear on the map list page if your map is published by the admin team.">
      </TooltipName>
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
    {#if user.isSuperadmin}
      <Label>
        <span>Ordering</span>
        <Input
          type="number"
          name="ordering"
          aria-invalid={$errors.ordering ? 'true' : undefined}
          bind:value={$form.ordering}
          {...$constraints.ordering} />
        {#if $errors.ordering}
          <Alert color="red">{$errors.ordering}</Alert>
        {/if}
      </Label>
    {/if}
    <Label>
      <TooltipName
        name="Geoguessr ID"
        tooltipText="To find the Map ID, open the GeoGuessr map page and check the URL. 
  The ID is the long string of letters and numbers after /maps/.

  Example:  
  https://www.geoguessr.com/maps/66fd7c30b34ca9145ec96a6a
  
  → The Map ID is 66fd7c30b34ca9145ec96a6a" />
      <Input
        type="text"
        name="geoguessrId"
        aria-invalid={$errors.geoguessrId ? 'true' : undefined}
        bind:value={$form.geoguessrId}
        {...$constraints.geoguessrId} />
      {#if $errors.geoguessrId}
        <Alert color="red">{$errors.geoguessrId}</Alert>
      {/if}
    </Label>
    <Label>
      <TooltipName
        name="Description"
        tooltipText="Description of the map that will appear on the map list page if your map is published by the admin team.">
      </TooltipName>
      <Textarea
        rows="6"
        name="description"
        aria-invalid={$errors.description ? 'true' : undefined}
        bind:value={$form.description}
        {...$constraints.description} />
      {#if $errors.description}
        <Alert color="red">{$errors.description}</Alert>
      {/if}
    </Label>
    <Label>
      <TooltipName
        name="Footer"
        tooltipText="This footer will appear below the meta note. However, if a footer is already set for the meta itself or if the meta is marked as Plonkit, that footer will take priority and be displayed instead.">
      </TooltipName>
      <MarkdownEditor {carta} mode="tabs" bind:value={$form.footer} />
    </Label>

    <Label>
      <TooltipName
        name="Author(s)"
        tooltipText="Author(s) of the map that will appear on the map list page if your map is published by the admin team.">
      </TooltipName>
      <Input
        type="text"
        name="authors"
        aria-invalid={$errors.authors ? 'true' : undefined}
        bind:value={$form.authors}
        {...$constraints.authors} />
      {#if $errors.authors}
        <Alert color="red">{$errors.authors}</Alert>
      {/if}
    </Label>
    {#if user.isSuperadmin || user.isTrusted}
      <Label>
        <div class="flex flex-row space-x-2">
          <Checkbox bind:checked={$form.isPublished}>Publish</Checkbox>
          {#if user.isSuperadmin}
            <Checkbox bind:checked={$form.isVerified}>Verified</Checkbox>
            <Checkbox bind:checked={$form.autoUpdate}>Auto Update</Checkbox>
          {/if}
        </div>
      </Label>
    {/if}

    <Label>
      <TooltipName
        name="Levels"
        tooltipText="Use this to include only metas that belong to specific levels you have assigned to them.">
      </TooltipName>
      <MultiSelect items={levelChoices} bind:value={$form.levels} size="lg" />
    </Label>
    <Label>
      <TooltipName
        name="Include Tags"
        tooltipText="Use this to include only specific metas based on their tag name. For example, to include only tags starting with 'Czechia-', enter 'Czechia-%'.
    
    Remember to save after you are done adding/removing filters.
    ">
      </TooltipName>
      <FilterManager
        bind:filters={$form.includeFilters}
        bind:filterInput={includeFilterInput}
        oppositeFilters={$form.excludeFilters} />
    </Label>
    <Label>
      <TooltipName
        name="Exclude Tags"
        tooltipText="Use this to exclude specific metas based on their tag name. For example, to exclude tags starting with 'Czechia-', enter 'Czechia-%'.
    
    Remember to save after you are done adding/removing filters.
    ">
      </TooltipName>
      <FilterManager
        bind:filters={$form.excludeFilters}
        bind:filterInput={excludeFilterInput}
        oppositeFilters={$form.includeFilters} />
    </Label>
    <Label>
      <TooltipName
        name="Regions"
        tooltipText="Select the regions where your map will appear if it is published by the admin team.">
      </TooltipName>
      <MultiSelect items={regionChoices} bind:value={$form.regions} size="lg" />
    </Label>
    <Label>
      <TooltipName
        name="Difficulty"
        tooltipText="Select the difficulty level that will be displayed on your map if it is published by the admin team.">
      </TooltipName>
      <ul
        class="items-center w-full rounded-lg border border-gray-200 sm:flex dark:bg-gray-800 dark:border-gray-600 divide-x rtl:divide-x-reverse divide-gray-200 dark:divide-gray-600">
        <li class="w-full">
          <Radio name="hor-list" value={1} bind:group={$form.difficulty} class="p-3">
            Beginner
          </Radio>
        </li>
        <li class="w-full">
          <Radio name="hor-list" value={2} bind:group={$form.difficulty} class="p-3">
            Intermediate
          </Radio>
        </li>
        <li class="w-full">
          <Radio name="hor-list" value={3} bind:group={$form.difficulty} class="p-3">
            Advanced
          </Radio>
        </li>
      </ul>
    </Label>
    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>
