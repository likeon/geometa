<script lang="ts">
  import { Button, Dropdown, DropdownItem, GradientButton, Input, Tooltip } from 'flowbite-svelte';
  import { applyAction, enhance } from '$app/forms';
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { toast } from '@zerodevx/svelte-toast';
  import MapUploadModal from './MapUploadModal.svelte';
  import MetasUploadModal from './MetasUploadModal.svelte';
  import MetaEditModal from './MetaEditModal.svelte';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import Icon from '@iconify/svelte';
  import LoadingSmall from '$lib/components/LoadingSmall.svelte';
  import DataTable from './table.svelte';
  import { columns } from './columns';
  let { data } = $props();

  const levelChoices = data.group.levels.map((item) => ({
    value: item.id,
    name: item.name
  }));

  const groupChoices = data
    .user!.permissions.filter((permission) => permission.mapGroup.id !== data.group.id)
    .map((permission) => ({
      value: permission.mapGroup.id,
      name: permission.mapGroup.name
    }));

  let isMetaModalOpen = $state(false);
  let isMapUploadModalOpen = $state(false);
  let isMetasUploadModalOpen = $state(false);
  let metas = $derived(data.group.metas);
  let selectedMetaId = $state(-1);
  let selectedMeta = $derived.by(() => {
    const meta = metas.find((meta) => meta.id == selectedMetaId);
    return meta != undefined ? meta : null;
  });

  let numberOfLocationsUploaded = $state(0);

  $effect(() => {
    if (numberOfLocationsUploaded != 0) {
      toast.push(`Successfully uploaded ${numberOfLocationsUploaded} locations!`, {
        duration: 5000
      });
    }
  });

  function addMeta() {
    selectedMetaId = -1;
    isMetaModalOpen = true;
  }

  function uploadLocations() {
    isMapUploadModalOpen = true;
  }

  let syncingUserScript = $state(false);
</script>

<svelte:head>
  <title>{data.group.name || '<No name>'} - Metas</title>
</svelte:head>

{#snippet userScriptSyncButtonContent()}
  {#if syncingUserScript}
    <div class="h-6 w-[7rem] flex items-center justify-center">
      <LoadingSmall />
    </div>
  {:else}
    Sync UserScript
  {/if}
{/snippet}

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="flex-grow flex items-center justify-end">
      <GradientButton color="cyanToBlue" class="ml-3" onclick={uploadLocations}
        >Upload locations
      </GradientButton>
      <Button class="ml-3" onclick={addMeta}>Add meta</Button>
      <form
        method="post"
        action="?/prepareUserScriptData"
        use:enhance={() => {
          syncingUserScript = true;
          return async ({ result, update }) => {
            syncingUserScript = false;
            if (result.type === 'success') {
              applyAction(result);
              if (data.group.id == 1) {
                const updateCount = result.data?.updateCount || 0;
                toast.push(`Updated ${updateCount} map(s)`);
              }

              toast.push('Updated', {
                duration: 10000
              });
            } else if (result.type === 'failure') {
              console.log(result.data);
              const errorMessage = result.data?.message || 'Something went wrong';
              toast.push(errorMessage, {
                theme: { '--toastBackground': 'red', '--toastColor': 'white' }
              });
            } else if (result.type === 'error') {
              console.log(result.error);
              const errorMessage = result.error.message || 'An error occurred';
              toast.push(errorMessage, {
                theme: { '--toastBackground': 'red', '--toastColor': 'white' }
              });
            }
            update();
          };
        }}>
        <!--{#if data.group.hasUnsycnedData}-->
        <!--  <GradientButton color="pinkToOrange" class="ml-3" type="submit">-->
        <!--    {@render userScriptSyncButtonContent()}-->
        <!--  </GradientButton>-->
        <!--{:else}-->
        <!--  <Button color="dark" class="ml-3" type="submit">-->
        <!--    {@render userScriptSyncButtonContent()}-->
        <!--  </Button>-->
        <!--{/if}-->
        <Button
          color="dark"
          class="ml-3"
          disabled={!['104498565430116352', '134938422182805504'].includes(data.user.id)}
          type="submit">
          {@render userScriptSyncButtonContent()}
        </Button>
        <Tooltip>
          Update your changes after editing or adding metas/maps to make them visible to users of
          the LearnableMeta script.
        </Tooltip>
      </form>
      <button>
        <Icon
          icon="pepicons-pop:dots-y"
          width="1rem"
          height="1rem"
          class="text-gray-800 dark:text-gray-300" />
      </button>
      <Dropdown>
        <DropdownItem
          onclick={() => (window.location.href = `/dev/dash/groups/${data.group.id}/download`)}>
          <div class="flex">
            <Icon
              icon="material-symbols:globe"
              width="1rem"
              height="1rem"
              class="text-gray-800 dark:text-gray-300" />
            <Icon
              icon="material-symbols:download-rounded"
              width="1rem"
              height="1rem"
              class="text-gray-800 dark:text-gray-300" />
            Download map group JSON
          </div>
        </DropdownItem>
        <DropdownItem onclick={() => (isMetasUploadModalOpen = true)}>
          <div class="flex">
            <Icon
              icon="mi:document"
              width="1rem"
              height="1rem"
              class="text-gray-800 dark:text-gray-300" />
            <Icon
              icon="material-symbols:upload-rounded"
              width="1rem"
              height="1rem"
              class="text-gray-800 dark:text-gray-300" />
            Upload metas
          </div>
        </DropdownItem>
        <DropdownItem
          onclick={() =>
            (window.location.href = `/dev/dash/groups/${data.group.id}/download-metas`)}>
          <div class="flex">
            <Icon
              icon="mi:document"
              width="1rem"
              height="1rem"
              class="text-gray-800 dark:text-gray-300" />
            <Icon
              icon="material-symbols:download-rounded"
              width="1rem"
              height="1rem"
              class="text-gray-800 dark:text-gray-300" />
            Download metas
          </div>
        </DropdownItem>
      </Dropdown>
    </div>
  </div>

  <DataTable
    data={metas}
    {columns}
    bind:isModalOpen={isMetaModalOpen}
    bind:selectedId={selectedMetaId} />

  {#if data.group.metas.length === 0}
    <div class="justify-center w-full flex mt-2">
      <p class="text-2xl">
        Upload locations using <a target="_blank" href="https://map-making.app/">map-making.app</a> json
        to prepopulate the metas.
      </p>
    </div>
  {/if}
</div>

<MetaEditModal
  bind:isMetaModalOpen
  metaForm={data.metaForm}
  copyForm={data.copyForm}
  {levelChoices}
  mapGroupChoices={groupChoices}
  groupId={data.group.id}
  {selectedMeta}
  imageUploadForm={data.imageUploadForm} />

<MapUploadModal
  bind:isUploadModalOpen={isMapUploadModalOpen}
  bind:numberOfLocationsUploaded
  data={data.mapUploadForm} />
<MetasUploadModal bind:isUploadModalOpen={isMetasUploadModalOpen} data={data.metasUploadForm} />

<SvelteToast />
