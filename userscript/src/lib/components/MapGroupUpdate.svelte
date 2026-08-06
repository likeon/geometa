<script lang="ts">
  import { onMount } from 'svelte';
  import { clearApiKey, getApiKey, saveApiKey, URL_TO_GENERATE_TOKEN } from '../utils/apiKey';
  import {
    fetchAccessibleMapGroups,
    fetchMapGroupManifest,
    fetchSyncedMapLocations,
    LearnableMetaApiError,
    type AccessibleMapGroup,
    type MapGroupManifest
  } from '../utils/learnableMetaApi';
  import { fingerprintMapCoordinates } from '../utils/mapFingerprint';
  import { getGeoguessrDraft, publishGeoguessrDraft, updateGeoguessrDraft } from '../utils/upload';

  type MapStatus =
    | 'scanning'
    | 'changed'
    | 'current'
    | 'empty'
    | 'scan-error'
    | 'updating'
    | 'publishing'
    | 'success'
    | 'update-error'
    | 'publish-error';

  type MapRow = MapGroupManifest['maps'][number] & {
    status: MapStatus;
    selected: boolean;
    error?: string;
  };

  let { groupId: initialGroupId, onClose }: { groupId?: number; onClose: () => void } = $props();

  const canChooseGroup = initialGroupId === undefined;
  let activeGroupId = $state<number | null>(initialGroupId ?? null);
  let phase = $state<'token' | 'groups' | 'scanning' | 'review' | 'updating'>('scanning');
  let apiToken = $state('');
  let tokenInput = $state('');
  let tokenError = $state('');
  let groupName = $state('');
  let accessibleGroups: AccessibleMapGroup[] = $state([]);
  let groupsLoading = $state(false);
  let rows: MapRow[] = $state([]);
  let fatalError = $state('');
  let finishedRun = $state(false);

  let selectedCount = $derived(
    rows.filter((row) => row.status === 'changed' && row.selected).length
  );
  let failureCount = $derived(
    rows.filter((row) => ['scan-error', 'update-error', 'publish-error'].includes(row.status))
      .length
  );
  let successCount = $derived(rows.filter((row) => row.status === 'success').length);
  let changedCount = $derived(rows.filter((row) => row.status === 'changed').length);

  onMount(() => {
    try {
      const savedToken = getApiKey();
      if (!savedToken) {
        phase = 'token';
        return;
      }
      apiToken = savedToken;
      void continueWithToken();
    } catch (error) {
      phase = 'token';
      tokenError = errorMessage(error);
    }
  });

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  function replaceRow(geoguessrId: string, update: Partial<MapRow>) {
    const index = rows.findIndex((row) => row.geoguessrId === geoguessrId);
    if (index !== -1) rows[index] = { ...rows[index], ...update };
  }

  async function saveTokenAndContinue() {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      tokenError = 'Paste a valid LearnableMeta API token.';
      return;
    }
    saveApiKey(trimmed);
    apiToken = trimmed;
    tokenInput = '';
    tokenError = '';
    await continueWithToken();
  }

  function changeToken() {
    tokenInput = '';
    tokenError = '';
    phase = 'token';
  }

  async function continueWithToken() {
    if (activeGroupId === null) {
      await loadAccessibleGroups();
    } else {
      await scanGroup();
    }
  }

  async function loadAccessibleGroups() {
    phase = 'groups';
    fatalError = '';
    finishedRun = false;
    groupName = '';
    rows = [];
    accessibleGroups = [];
    groupsLoading = true;
    try {
      accessibleGroups = await fetchAccessibleMapGroups(apiToken);
    } catch (error) {
      if (error instanceof LearnableMetaApiError && error.status === 401) {
        clearApiKey();
        apiToken = '';
        tokenError = 'Your LearnableMeta API token was rejected. Paste a new token.';
        phase = 'token';
        return;
      }
      fatalError = errorMessage(error);
    } finally {
      groupsLoading = false;
    }
  }

  function selectGroup(groupId: number) {
    activeGroupId = groupId;
    void scanGroup();
  }

  function changeGroup() {
    activeGroupId = null;
    void loadAccessibleGroups();
  }

  async function scanGroup() {
    if (activeGroupId === null) {
      await loadAccessibleGroups();
      return;
    }
    phase = 'scanning';
    fatalError = '';
    finishedRun = false;
    groupName = '';
    rows = [];
    try {
      const manifest = await fetchMapGroupManifest(activeGroupId, apiToken);
      groupName = manifest.group.name;
      rows = manifest.maps.map((map) => ({
        ...map,
        status: map.locationCount === 0 ? 'empty' : 'scanning',
        selected: false
      }));

      let nextIndex = 0;
      async function worker() {
        while (nextIndex < rows.length) {
          const row = rows[nextIndex++];
          if (row.status === 'scanning') await scanMap(row);
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, rows.length) }, () => worker()));
      phase = 'review';
    } catch (error) {
      if (error instanceof LearnableMetaApiError && error.status === 401) {
        clearApiKey();
        apiToken = '';
        tokenError = 'Your LearnableMeta API token was rejected. Paste a new token.';
        phase = 'token';
        return;
      }
      fatalError = errorMessage(error);
      phase = 'review';
    }
  }

  async function scanMap(row: MapRow) {
    replaceRow(row.geoguessrId, { status: 'scanning', error: undefined, selected: false });
    try {
      const draft = await getGeoguessrDraft(row.geoguessrId);
      const fingerprint = await fingerprintMapCoordinates(draft.customCoordinates ?? []);
      const changed = fingerprint !== row.fingerprint;
      replaceRow(row.geoguessrId, {
        status: changed ? 'changed' : 'current',
        selected: changed
      });
    } catch (error) {
      replaceRow(row.geoguessrId, {
        status: 'scan-error',
        selected: false,
        error: errorMessage(error)
      });
    }
  }

  function selectChanged(selected: boolean) {
    rows = rows.map((row) => (row.status === 'changed' ? { ...row, selected } : row));
  }

  async function updateSelected() {
    const selectedIds = rows
      .filter((row) => row.status === 'changed' && row.selected)
      .map((row) => row.geoguessrId);
    if (selectedIds.length === 0) return;

    phase = 'updating';
    finishedRun = false;
    for (const geoguessrId of selectedIds) {
      const row = rows.find((candidate) => candidate.geoguessrId === geoguessrId);
      if (row) await updateMap(row);
    }
    finishedRun = true;
    phase = 'review';
  }

  async function updateMap(row: MapRow) {
    replaceRow(row.geoguessrId, { status: 'updating', error: undefined });
    let draft;
    try {
      draft = await getGeoguessrDraft(row.geoguessrId);
      const currentFingerprint = await fingerprintMapCoordinates(draft.customCoordinates ?? []);
      if (currentFingerprint === row.fingerprint) {
        replaceRow(row.geoguessrId, { status: 'current', selected: false });
        return;
      }
      const coordinates = await fetchSyncedMapLocations(row.geoguessrId, apiToken, row.fingerprint);
      if (coordinates.length === 0) throw new Error('Cannot publish an empty map');
      await updateGeoguessrDraft(row.geoguessrId, draft, coordinates);
    } catch (error) {
      replaceRow(row.geoguessrId, {
        status: 'update-error',
        error: errorMessage(error)
      });
      return;
    }

    replaceRow(row.geoguessrId, { status: 'publishing' });
    try {
      await publishGeoguessrDraft(row.geoguessrId);
      replaceRow(row.geoguessrId, { status: 'success', selected: false });
    } catch (error) {
      replaceRow(row.geoguessrId, {
        status: 'publish-error',
        error: errorMessage(error)
      });
    }
  }

  async function retryFailures() {
    phase = 'updating';
    finishedRun = false;
    const failedIds = rows
      .filter((row) => ['scan-error', 'update-error', 'publish-error'].includes(row.status))
      .map((row) => row.geoguessrId);

    for (const geoguessrId of failedIds) {
      const row = rows.find((candidate) => candidate.geoguessrId === geoguessrId);
      if (!row) continue;
      if (row.status === 'scan-error') {
        await scanMap(row);
      } else if (row.status === 'publish-error') {
        replaceRow(row.geoguessrId, { status: 'publishing', error: undefined });
        try {
          await publishGeoguessrDraft(row.geoguessrId);
          replaceRow(row.geoguessrId, { status: 'success', selected: false });
        } catch (error) {
          replaceRow(row.geoguessrId, {
            status: 'publish-error',
            error: errorMessage(error)
          });
        }
      } else {
        await updateMap(row);
      }
    }
    finishedRun = true;
    phase = 'review';
  }

  function statusLabel(row: MapRow): string {
    const labels: Record<MapStatus, string> = {
      scanning: 'Checking…',
      changed: 'Update available',
      current: 'Up to date',
      empty: 'No synchronized locations',
      'scan-error': 'Could not check',
      updating: 'Updating draft…',
      publishing: 'Publishing…',
      success: 'Updated and published',
      'update-error': 'Update failed',
      'publish-error': 'Draft updated; publish failed'
    };
    return labels[row.status];
  }
</script>

<div class="backdrop" role="presentation">
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="group-update-title">
    <header>
      <div>
        <p class="eyebrow">LearnableMeta</p>
        <h1 id="group-update-title">
          {phase === 'groups' ? 'Choose a map group' : 'Update GeoGuessr maps'}
        </h1>
        {#if groupName}<p class="subtitle">{groupName}</p>{/if}
      </div>
      <button
        class="icon-button"
        onclick={onClose}
        disabled={phase === 'updating'}
        aria-label="Close">
        ×
      </button>
    </header>

    {#if phase === 'token'}
      <div class="token-form">
        <p>Paste your LearnableMeta API token to load maps you can manage.</p>
        <p class="small">
          Generate or replace it on your
          <a href={URL_TO_GENERATE_TOKEN} target="_blank" rel="noopener noreferrer">token page</a>.
        </p>
        <input
          type="password"
          bind:value={tokenInput}
          placeholder="LearnableMeta API token"
          aria-label="LearnableMeta API token"
          onkeydown={(event) => event.key === 'Enter' && void saveTokenAndContinue()} />
        {#if tokenError}<p class="error-text">{tokenError}</p>{/if}
        <div class="actions">
          <button class="secondary" onclick={onClose}>Cancel</button>
          <button class="primary" onclick={saveTokenAndContinue}>Save and continue</button>
        </div>
      </div>
    {:else if phase === 'groups'}
      {#if groupsLoading}
        <div class="notice">Loading your synchronized map groups…</div>
      {:else if fatalError}
        <div class="fatal">
          <strong>Could not load your map groups.</strong>
          <span>{fatalError}</span>
          <button class="secondary" onclick={loadAccessibleGroups}>Try again</button>
        </div>
      {:else if accessibleGroups.length > 0}
        <div class="notice">Select a synchronized LearnableMeta group to compare its maps.</div>
        <div class="group-list">
          {#each accessibleGroups as group (group.id)}
            <button class="group-row" onclick={() => selectGroup(group.id)}>
              <strong>{group.name}</strong>
              <span>{group.mapCount} map{group.mapCount === 1 ? '' : 's'}</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="notice">You have no synchronized map groups containing maps.</div>
      {/if}
      <footer class="actions">
        <button class="link-button token-button" onclick={changeToken}>Change API token</button>
        <button class="secondary" onclick={onClose}>Close</button>
      </footer>
    {:else}
      {#if phase === 'scanning'}
        <div class="notice">Loading synchronized maps and comparing GeoGuessr drafts…</div>
      {/if}
      {#if fatalError}
        <div class="fatal">
          <strong>Could not load this group.</strong>
          <span>{fatalError}</span>
          <button class="secondary" onclick={scanGroup}>Try again</button>
        </div>
      {/if}

      {#if rows.length > 0}
        <div class="toolbar">
          <span>{rows.length} map{rows.length === 1 ? '' : 's'}</span>
          <div>
            <button class="link-button" onclick={() => selectChanged(true)}>Select changed</button>
            <button class="link-button" onclick={() => selectChanged(false)}>Deselect all</button>
          </div>
        </div>
        <div class="map-list">
          {#each rows as row (row.geoguessrId)}
            <label class:error-row={row.error} class="map-row">
              <input
                type="checkbox"
                bind:checked={row.selected}
                disabled={row.status !== 'changed' || phase === 'updating'} />
              <span class="map-details">
                <strong>{row.name}</strong>
                <span>{row.locationCount.toLocaleString()} synchronized locations</span>
                {#if row.error}<span class="row-error">{row.error}</span>{/if}
              </span>
              <span
                class:good={row.status === 'current' || row.status === 'success'}
                class="status">
                {statusLabel(row)}
              </span>
            </label>
          {/each}
        </div>
      {:else if phase === 'review' && !fatalError}
        <div class="notice">This group has no maps to update.</div>
      {/if}

      {#if finishedRun}
        <div class="summary">
          Finished: {successCount} published, {failureCount} failed, {changedCount} still available.
        </div>
      {/if}

      <footer class="actions">
        <button
          class="link-button token-button"
          onclick={changeToken}
          disabled={phase === 'updating'}>
          Change API token
        </button>
        {#if canChooseGroup}
          <button class="link-button" onclick={changeGroup} disabled={phase === 'updating'}>
            Change group
          </button>
        {/if}
        <button class="secondary" onclick={onClose} disabled={phase === 'updating'}>Close</button>
        {#if failureCount > 0}
          <button class="secondary" onclick={retryFailures} disabled={phase === 'updating'}>
            Retry failed ({failureCount})
          </button>
        {/if}
        <button
          class="primary"
          onclick={updateSelected}
          disabled={phase !== 'review' || selectedCount === 0}>
          {phase === 'updating' ? 'Updating…' : `Update and publish (${selectedCount})`}
        </button>
      </footer>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(4, 8, 18, 0.78);
    font-family: Arial, sans-serif;
    color: #172033;
  }
  .panel {
    width: min(780px, 100%);
    max-height: min(760px, calc(100vh - 48px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #d8dee9;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 22px 24px 18px;
    border-bottom: 1px solid #e8ebf0;
  }
  h1 {
    margin: 2px 0 0;
    font-size: 24px;
    color: #101828;
  }
  .eyebrow {
    margin: 0;
    color: #936b00;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .subtitle {
    margin: 5px 0 0;
    color: #667085;
  }
  .icon-button {
    border: 0;
    background: transparent;
    font-size: 28px;
    color: #667085;
    cursor: pointer;
  }
  .notice,
  .fatal,
  .summary {
    margin: 18px 24px 0;
    padding: 12px 14px;
    border-radius: 8px;
    background: #f5f7fa;
  }
  .fatal {
    display: grid;
    gap: 8px;
    background: #fff1f1;
    color: #8a1c1c;
  }
  .summary {
    background: #eef8ee;
    color: #245b29;
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px 10px;
    color: #475467;
    font-size: 13px;
  }
  .group-list {
    display: grid;
    gap: 8px;
    overflow-y: auto;
    margin: 14px 24px 0;
  }
  .group-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    border: 1px solid #d9dee7;
    border-radius: 9px;
    padding: 13px 15px;
    background: #fff;
    color: #172033;
    text-align: left;
    cursor: pointer;
  }
  .group-row:hover {
    border-color: #d3a300;
    background: #fffaf0;
  }
  .group-row span {
    flex: none;
    color: #667085;
    font-size: 12px;
  }
  .map-list {
    overflow-y: auto;
    margin: 0 24px;
    border: 1px solid #e4e7ec;
    border-radius: 9px;
  }
  .map-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid #eef0f3;
  }
  .map-row:last-child {
    border-bottom: 0;
  }
  .map-row.error-row {
    background: #fffafa;
  }
  .map-details {
    display: grid;
    min-width: 0;
    gap: 3px;
  }
  .map-details strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .map-details > span {
    color: #667085;
    font-size: 12px;
  }
  .map-details .row-error {
    color: #a32626;
    white-space: normal;
  }
  .status {
    padding: 4px 8px;
    border-radius: 999px;
    background: #fff2cc;
    color: #765700;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .status.good {
    background: #e9f8ec;
    color: #24612d;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 9px;
    padding: 18px 24px 22px;
  }
  button {
    font: inherit;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .primary,
  .secondary {
    border-radius: 7px;
    padding: 9px 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .primary {
    border: 1px solid #d3a300;
    background: #f5c542;
    color: #172033;
  }
  .secondary {
    border: 1px solid #cfd5df;
    background: #fff;
    color: #344054;
  }
  .link-button {
    border: 0;
    padding: 4px 7px;
    background: transparent;
    color: #3458a5;
    cursor: pointer;
  }
  .token-button {
    margin-right: auto;
  }
  .token-form {
    display: grid;
    gap: 12px;
    padding: 22px 24px;
  }
  .token-form p {
    margin: 0;
  }
  .token-form .small {
    color: #667085;
    font-size: 13px;
  }
  .token-form a {
    color: #3458a5;
  }
  .token-form input {
    border: 1px solid #cfd5df;
    border-radius: 7px;
    padding: 10px 12px;
    font: inherit;
  }
  .token-form .actions {
    padding: 4px 0 0;
  }
  .error-text {
    color: #a32626;
    font-size: 13px;
  }
  @media (max-width: 620px) {
    .backdrop {
      padding: 8px;
    }
    .panel {
      max-height: calc(100vh - 16px);
    }
    .map-row {
      grid-template-columns: 22px minmax(0, 1fr);
    }
    .status {
      grid-column: 2;
      justify-self: start;
    }
    footer.actions {
      flex-wrap: wrap;
    }
    .token-button {
      width: 100%;
      text-align: left;
    }
  }
</style>
