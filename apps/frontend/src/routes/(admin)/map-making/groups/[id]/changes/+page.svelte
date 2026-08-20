<script lang="ts">
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import Icon from '@iconify/svelte';
  import { diffLines } from '$lib/utils/text-diff';
  import { SvelteSet } from 'svelte/reactivity';

  let { data } = $props();

  type Change = (typeof data.changes)[number];
  type JsonRecord = Record<string, unknown>;

  const entityTypeLabels: Record<string, string> = {
    meta: 'Meta',
    meta_image: 'Image',
    meta_geojson: 'Map area',
    meta_levels: 'Level assignment',
    location_batch: 'Locations',
    level: 'Level',
    map: 'Map',
    group: 'Group',
    settings: 'Settings',
    sync: 'Sync'
  };

  const operationLabels: Record<string, string> = {
    create: 'created',
    update: 'edited',
    delete: 'deleted'
  };

  const operationClasses: Record<string, string> = {
    create: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    update: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  };

  const expandedIds = new SvelteSet<number>();
  const expandedSections = new SvelteSet<string>();

  // svelte-ignore state_referenced_locally
  let hasMore = $state(data.hasMore);
  let olderChanges = $state<Change[]>([]);
  let loadingMore = $state(false);
  let loadError = $state(false);

  let authorFilter = $state('all');

  // the component is reused when navigating between groups - reset the
  // pagination and UI state so one group's history can't leak into another's
  // svelte-ignore state_referenced_locally
  let loadedGroupId = $state(data.group.id);
  $effect(() => {
    if (data.group.id !== loadedGroupId) {
      loadedGroupId = data.group.id;
      olderChanges = [];
      hasMore = data.hasMore;
      loadError = false;
      authorFilter = 'all';
      expandedIds.clear();
      expandedSections.clear();
    }
  });

  let allSynced = $derived([...data.changes, ...olderChanges]);

  // sync markers are section headers, not filterable entries - excluding them
  // keeps sync-only users out of the author dropdown
  let authors = $derived(
    [
      ...new Set(
        [...data.unsyncedChanges, ...allSynced]
          .filter((change) => change.entityType !== 'sync')
          .map((change) => change.user.username)
      )
    ].sort((a, b) => a.localeCompare(b))
  );

  function matchesAuthor(change: Change) {
    return authorFilter === 'all' || change.user.username === authorFilter;
  }

  let unsyncedFiltered = $derived(data.unsyncedChanges.filter(matchesAuthor));

  type Section = { key: string; marker: Change | null; entries: Change[] };

  // synced history split into sections, each headed by a sync marker; entries
  // above the newest marker belong to the latest sync (markers only exist
  // since the change log was introduced)
  let sections = $derived.by(() => {
    const out: Section[] = [];
    let current: Section | null = null;
    for (const change of allSynced) {
      if (change.entityType === 'sync') {
        current = { key: `s${change.id}`, marker: change, entries: [] };
        out.push(current);
        continue;
      }
      if (!current) {
        current = { key: 'latest', marker: null, entries: [] };
        out.push(current);
      }
      current.entries.push(change);
    }
    return out;
  });

  let visibleSections = $derived(
    sections
      .map((section) => ({ ...section, entries: section.entries.filter(matchesAuthor) }))
      .filter((section) => section.entries.length > 0)
  );

  function toggle(id: number) {
    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }
  }

  function toggleSection(key: string) {
    if (expandedSections.has(key)) {
      expandedSections.delete(key);
    } else {
      expandedSections.add(key);
    }
  }

  function asRecord(value: unknown): JsonRecord {
    return value && typeof value === 'object' ? (value as JsonRecord) : {};
  }

  function changedFields(change: Change) {
    const oldValue = asRecord(change.oldValue);
    const newValue = asRecord(change.newValue);
    const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    return [...keys]
      .filter((key) => JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key]))
      .map((key) => ({ key, oldVal: oldValue[key], newVal: newValue[key] }));
  }

  function hasDetails(change: Change) {
    return change.oldValue !== null || change.newValue !== null;
  }

  function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '(empty)';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '(none)';
    return String(value);
  }

  function isMultiline(oldVal: unknown, newVal: unknown): boolean {
    const text = `${typeof oldVal === 'string' ? oldVal : ''}${typeof newVal === 'string' ? newVal : ''}`;
    return text.includes('\n') || text.length > 120;
  }

  function formatDay(createdAt: number) {
    return new Date(createdAt * 1000).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatTime(createdAt: number) {
    return new Date(createdAt * 1000).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDayTime(createdAt: number) {
    return new Date(createdAt * 1000).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function sectionTitle(section: Section) {
    if (section.marker) {
      return `Synced ${formatDayTime(section.marker.createdAt)} by ${section.marker.user.username}`;
    }
    if (data.group.syncedAt !== null) {
      return `Synced ${formatDayTime(data.group.syncedAt)}`;
    }
    return 'Earlier changes';
  }

  function sectionAuthors(entries: Change[]) {
    const names = [...new Set(entries.map((change) => change.user.username))];
    return names.length > 3
      ? `${names.slice(0, 3).join(', ')} +${names.length - 3}`
      : names.join(', ');
  }

  function groupByDay(entries: Change[]) {
    const groups: { day: string; changes: Change[] }[] = [];
    for (const change of entries) {
      const day = formatDay(change.createdAt);
      const last = groups.at(-1);
      if (last && last.day === day) {
        last.changes.push(change);
      } else {
        groups.push({ day, changes: [change] });
      }
    }
    return groups;
  }

  async function loadOlder() {
    const last = allSynced.at(-1);
    if (!last || loadingMore) return;
    const requestGroupId = data.group.id;
    loadingMore = true;
    loadError = false;
    try {
      const response = await fetch(
        `/map-making/groups/${requestGroupId}/changes/feed?before=${last.createdAt}_${last.id}`
      );
      if (!response.ok) throw new Error(`feed request failed: ${response.status}`);
      const payload: { changes: Change[]; hasMore: boolean } = await response.json();
      // the user may have navigated to another group's log mid-flight
      if (requestGroupId !== data.group.id) return;
      olderChanges = [...olderChanges, ...payload.changes];
      hasMore = payload.hasMore;
    } catch {
      if (requestGroupId === data.group.id) {
        loadError = true;
      }
    } finally {
      loadingMore = false;
    }
  }
</script>

<svelte:head>
  <title>{data.group.name || '<No name>'} - Changes</title>
</svelte:head>

{#snippet entryList(entries: Change[])}
  {#each groupByDay(entries) as dayGroup (dayGroup.day)}
    <h5 class="mt-3 mb-1 text-xs font-semibold text-muted-foreground">{dayGroup.day}</h5>
    <div class="space-y-1">
      {#each dayGroup.changes as change (change.id)}
        <div class="rounded-md border">
          <svelte:element
            this={hasDetails(change) ? 'button' : 'div'}
            type={hasDetails(change) ? 'button' : undefined}
            role={hasDetails(change) ? 'button' : undefined}
            aria-expanded={hasDetails(change) ? expandedIds.has(change.id) : undefined}
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm {hasDetails(change)
              ? 'cursor-pointer hover:bg-muted/50'
              : ''}"
            onclick={hasDetails(change) ? () => toggle(change.id) : undefined}>
            <span class="text-muted-foreground tabular-nums w-12 shrink-0"
              >{formatTime(change.createdAt)}</span>
            <span class="font-medium">{change.user.username}</span>
            <span
              class="rounded px-1.5 py-0.5 text-xs font-medium {operationClasses[
                change.operation
              ]}">
              {operationLabels[change.operation]}
            </span>
            <Badge variant="outline">{entityTypeLabels[change.entityType]}</Badge>
            {#if change.entityLabel}
              <span class="truncate">{change.entityLabel}</span>
            {/if}
            <span class="grow"></span>
            {#if hasDetails(change)}
              <Icon
                icon={expandedIds.has(change.id)
                  ? 'material-symbols:expand-less'
                  : 'material-symbols:expand-more'}
                class="shrink-0 text-muted-foreground" />
            {/if}
          </svelte:element>

          {#if expandedIds.has(change.id)}
            <div class="border-t px-3 py-2 space-y-2 text-sm">
              {#each changedFields(change) as field (field.key)}
                <div>
                  <p class="text-xs font-semibold text-muted-foreground uppercase">{field.key}</p>
                  {#if isMultiline(field.oldVal, field.newVal)}
                    <pre
                      class="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap">{#each diffLines(typeof field.oldVal === 'string' ? field.oldVal : '', typeof field.newVal === 'string' ? field.newVal : '') as line, index (index)}<span
                          class={line.type === 'add'
                            ? 'block bg-green-100 dark:bg-green-900/40'
                            : line.type === 'del'
                              ? 'block bg-red-100 line-through dark:bg-red-900/40'
                              : 'block'}>{line.text || ' '}</span
                        >{/each}</pre>
                  {:else}
                    <p class="mt-0.5">
                      {#if change.operation !== 'create'}
                        <span class="text-red-700 dark:text-red-400 line-through"
                          >{formatValue(field.oldVal)}</span>
                        <span class="text-muted-foreground mx-1">→</span>
                      {/if}
                      <span class="text-green-700 dark:text-green-400"
                        >{formatValue(field.newVal)}</span>
                    </p>
                  {/if}
                </div>
              {:else}
                <p class="text-muted-foreground">No field-level details for this change.</p>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
{/snippet}

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name} canRename={data.role === 'owner'}
  ></DashNavBar>

  <div class="flex flex-wrap items-end justify-between gap-2">
    <div>
      <h4 class="text-lg font-semibold">Change log</h4>
      <p class="text-sm text-muted-foreground">Who changed what in this group.</p>
    </div>
    <select
      bind:value={authorFilter}
      aria-label="Filter by author"
      class="border-input bg-background h-8 rounded-md border px-2 text-sm">
      <option value="all">All authors</option>
      {#each authors as author (author)}
        <option value={author}>{author}</option>
      {/each}
    </select>
  </div>

  {#if data.unsyncedChanges.length === 0 && allSynced.length === 0}
    <p class="mt-8 text-center text-muted-foreground">
      No changes recorded yet. Edits made from now on will show up here.
    </p>
  {/if}

  {#if unsyncedFiltered.length > 0}
    <div class="mt-4 rounded-lg border-2 border-blue-200 dark:border-blue-900 p-3">
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
        <h5 class="font-semibold">
          Unsynced changes
          <span class="text-muted-foreground font-normal">({unsyncedFiltered.length})</span>
        </h5>
      </div>
      <p class="text-xs text-muted-foreground">Not visible to players until the next sync.</p>
      {@render entryList(unsyncedFiltered)}
    </div>
  {:else if authorFilter === 'all' && allSynced.length > 0 && data.group.syncedAt !== null}
    <p class="mt-4 text-sm text-muted-foreground">No unsynced changes - everything is published.</p>
  {:else if authorFilter === 'all' && allSynced.length > 0}
    <p class="mt-4 text-sm text-muted-foreground">
      Sync status unknown - the group needs a sync (e.g. after a settings change).
    </p>
  {/if}

  <div class="mt-4 space-y-2">
    {#each visibleSections as section (section.key)}
      <div class="rounded-lg border">
        <button
          type="button"
          aria-expanded={expandedSections.has(section.key)}
          class="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-muted/50"
          onclick={() => toggleSection(section.key)}>
          <Icon
            icon={expandedSections.has(section.key)
              ? 'material-symbols:expand-less'
              : 'material-symbols:expand-more'}
            class="shrink-0 text-muted-foreground" />
          <span class="font-medium text-sm">{sectionTitle(section)}</span>
          <span class="text-sm text-muted-foreground">
            {section.entries.length} change{section.entries.length === 1 ? '' : 's'} by {sectionAuthors(
              section.entries
            )}
          </span>
        </button>
        {#if expandedSections.has(section.key)}
          <div class="border-t px-3 pb-3">
            {@render entryList(section.entries)}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if (data.unsyncedChanges.length > 0 || allSynced.length > 0) && unsyncedFiltered.length === 0 && visibleSections.length === 0}
    <p class="mt-6 text-center text-muted-foreground">
      {authorFilter !== 'all'
        ? `No changes by ${authorFilter} in the loaded history.`
        : 'No content changes in the loaded history - only sync markers.'}
    </p>
  {/if}

  {#if hasMore}
    <div class="mt-4 flex flex-col items-center gap-1">
      <Button variant="outline" onclick={loadOlder} disabled={loadingMore}>
        {loadingMore ? 'Loading...' : 'Load older changes'}
      </Button>
      {#if loadError}
        <p class="text-sm text-destructive">Failed to load older changes - try again.</p>
      {/if}
    </div>
  {/if}
</div>
