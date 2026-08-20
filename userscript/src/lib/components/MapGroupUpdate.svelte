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
  import { getGeoguessrDraftCoordinates } from '../utils/geoguessrDraft';
  import { modalDialog } from '../utils/modalDialog';
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
      const fingerprint = await fingerprintMapCoordinates(getGeoguessrDraftCoordinates(draft));
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
      const currentFingerprint = await fingerprintMapCoordinates(
        getGeoguessrDraftCoordinates(draft)
      );
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

  function statusTone(row: MapRow): 'good' | 'warning' | 'bad' | 'working' | 'neutral' {
    if (row.status === 'current' || row.status === 'success') return 'good';
    if (['scan-error', 'update-error', 'publish-error'].includes(row.status)) return 'bad';
    if (['scanning', 'updating', 'publishing'].includes(row.status)) return 'working';
    if (row.status === 'empty') return 'neutral';
    return 'warning';
  }
</script>

<div class="learnablemeta-modal-backdrop learnablemeta-ui" role="presentation">
  <div
    class="learnablemeta-modal learnablemeta-modal--map-update"
    role="dialog"
    aria-modal="true"
    aria-labelledby="group-update-title"
    use:modalDialog={{ onClose, closeOnEscape: phase !== 'updating' }}>
    <header class="learnablemeta-modal-header learnablemeta-modal-header--row">
      <div>
        <p class="learnablemeta-modal-eyebrow">LearnableMeta</p>
        <h1
          class="learnablemeta-modal-title learnablemeta-modal-title--large"
          id="group-update-title">
          {phase === 'groups' ? 'Choose a map group' : 'Update GeoGuessr maps'}
        </h1>
        {#if groupName}<p class="subtitle">{groupName}</p>{/if}
      </div>
      <button
        class="learnablemeta-button learnablemeta-button--ghost map-update-close"
        onclick={onClose}
        disabled={phase === 'updating'}
        aria-label="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12"></path>
        </svg>
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
          class="learnablemeta-modal-input"
          data-modal-initial-focus
          onkeydown={(event) => event.key === 'Enter' && void saveTokenAndContinue()} />
        {#if tokenError}<p class="error-text">{tokenError}</p>{/if}
        <div class="learnablemeta-modal-actions token-actions">
          <button class="learnablemeta-button learnablemeta-button--outline" onclick={onClose}
            >Cancel</button>
          <button
            class="learnablemeta-button learnablemeta-button--primary"
            onclick={saveTokenAndContinue}>Save and continue</button>
        </div>
      </div>
    {:else if phase === 'groups'}
      {#if groupsLoading}
        <div class="notice">Loading your synchronized map groups…</div>
      {:else if fatalError}
        <div class="fatal">
          <strong>Could not load your map groups.</strong>
          <span>{fatalError}</span>
          <button
            class="learnablemeta-button learnablemeta-button--outline"
            onclick={loadAccessibleGroups}>Try again</button>
        </div>
      {:else if accessibleGroups.length > 0}
        <div class="notice">Select a synchronized LearnableMeta group to compare its maps.</div>
        <div class="group-list">
          {#each accessibleGroups as group (group.id)}
            <button class="group-row" onclick={() => selectGroup(group.id)}>
              <span class="group-details">
                <strong>{group.name}</strong>
                <span>Synchronized and ready to compare</span>
              </span>
              <span class="group-count">
                {group.mapCount} map{group.mapCount === 1 ? '' : 's'}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="notice">You have no synchronized map groups containing maps.</div>
      {/if}
      <footer class="learnablemeta-modal-actions">
        <button
          class="learnablemeta-button learnablemeta-button--link learnablemeta-modal-action-leading"
          onclick={changeToken}>Change API token</button>
        <button class="learnablemeta-button learnablemeta-button--outline" onclick={onClose}
          >Close</button>
      </footer>
    {:else}
      {#if phase === 'scanning'}
        <div class="notice">Loading synchronized maps and comparing GeoGuessr drafts…</div>
      {/if}
      {#if fatalError}
        <div class="fatal">
          <strong>Could not load this group.</strong>
          <span>{fatalError}</span>
          <button class="learnablemeta-button learnablemeta-button--outline" onclick={scanGroup}
            >Try again</button>
        </div>
      {/if}

      {#if rows.length > 0}
        <div class="toolbar">
          <span>{rows.length} map{rows.length === 1 ? '' : 's'}</span>
          <div>
            <button
              class="learnablemeta-button learnablemeta-button--link"
              onclick={() => selectChanged(true)}>Select changed</button>
            <button
              class="learnablemeta-button learnablemeta-button--link"
              onclick={() => selectChanged(false)}>Deselect all</button>
          </div>
        </div>
        <div class="map-list">
          {#each rows as row (row.geoguessrId)}
            <label class:error-row={row.error} class:selected={row.selected} class="map-row">
              <input
                type="checkbox"
                bind:checked={row.selected}
                disabled={row.status !== 'changed' || phase === 'updating'} />
              <span class="map-details">
                <strong>{row.name}</strong>
                <span>{row.locationCount.toLocaleString()} synchronized locations</span>
                {#if row.error}<span class="row-error">{row.error}</span>{/if}
              </span>
              <span class="status {statusTone(row)}">
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

      <footer class="learnablemeta-modal-actions">
        <button
          class="learnablemeta-button learnablemeta-button--link learnablemeta-modal-action-leading"
          onclick={changeToken}
          disabled={phase === 'updating'}>
          Change API token
        </button>
        {#if canChooseGroup}
          <button
            class="learnablemeta-button learnablemeta-button--link"
            onclick={changeGroup}
            disabled={phase === 'updating'}>
            Change group
          </button>
        {/if}
        <button
          class="learnablemeta-button learnablemeta-button--outline"
          onclick={onClose}
          disabled={phase === 'updating'}>Close</button>
        {#if failureCount > 0}
          <button
            class="learnablemeta-button learnablemeta-button--outline"
            onclick={retryFailures}
            disabled={phase === 'updating'}>
            Retry failed ({failureCount})
          </button>
        {/if}
        <button
          class="learnablemeta-button learnablemeta-button--primary"
          onclick={updateSelected}
          disabled={phase !== 'review' || selectedCount === 0}>
          {phase === 'updating' ? 'Updating…' : `Update and publish (${selectedCount})`}
        </button>
      </footer>
    {/if}
  </div>
</div>

<style>
  .subtitle {
    margin: 6px 0 0;
    color: var(--lm-muted-foreground);
    font-size: 14px;
  }
  .map-update-close {
    width: 32px;
    height: 32px;
    padding: 0;
  }
  .map-update-close svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }
  .notice,
  .fatal,
  .summary {
    margin: 18px 24px 0;
    padding: 13px 15px;
    border: 1px solid var(--lm-border);
    border-radius: var(--lm-radius);
    background: var(--lm-muted);
    color: var(--lm-muted-foreground);
    font-size: 14px;
    line-height: 1.45;
  }
  .fatal {
    display: grid;
    gap: 10px;
    border-color: rgba(220, 38, 38, 0.35);
    background: rgba(220, 38, 38, 0.09);
    color: var(--lm-destructive);
  }
  .fatal .learnablemeta-button {
    justify-self: start;
  }
  .summary {
    border-color: rgba(22, 163, 74, 0.3);
    background: rgba(22, 163, 74, 0.1);
    color: #166534;
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 18px 24px 10px;
    color: var(--lm-muted-foreground);
    font-size: 13px;
    font-weight: 500;
  }
  .toolbar > div {
    display: flex;
    gap: 4px;
  }
  .group-list {
    display: grid;
    gap: 8px;
    overflow-y: auto;
    max-height: 390px;
    margin: 14px 24px 0;
    padding: 1px;
  }
  .group-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    min-height: 62px;
    border: 1px solid var(--lm-border);
    border-radius: var(--lm-radius);
    padding: 12px 14px;
    background: var(--lm-card);
    color: var(--lm-card-foreground);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .group-row:hover {
    border-color: var(--lm-ring);
    background: color-mix(in srgb, var(--lm-primary) 6%, var(--lm-card));
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }
  .group-row:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--lm-ring) 30%, transparent);
  }
  .group-details {
    display: grid;
    min-width: 0;
    gap: 3px;
  }
  .group-details strong {
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .group-details > span {
    color: var(--lm-muted-foreground);
    font-size: 12px;
  }
  .group-count {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    color: var(--lm-muted-foreground);
    font-size: 12px;
    font-weight: 500;
  }
  .group-count svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }
  .map-list {
    overflow-y: auto;
    margin: 0 24px;
    border: 1px solid var(--lm-border);
    border-radius: var(--lm-radius);
    background: var(--lm-card);
  }
  .map-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--lm-border);
    color: var(--lm-card-foreground);
    transition: background-color 0.15s ease;
  }
  .map-row:hover {
    background: var(--lm-muted);
  }
  .map-row.selected {
    background: color-mix(in srgb, var(--lm-primary) 7%, var(--lm-card));
  }
  .map-row:last-child {
    border-bottom: 0;
  }
  .map-row.error-row {
    background: rgba(220, 38, 38, 0.06);
  }
  .map-row input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: var(--lm-primary);
  }
  .map-details {
    display: grid;
    min-width: 0;
    gap: 3px;
  }
  .map-details strong {
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .map-details > span {
    color: var(--lm-muted-foreground);
    font-size: 12px;
  }
  .map-details .row-error {
    color: var(--lm-destructive);
    white-space: normal;
  }
  .status {
    padding: 3px 8px;
    border: 1px solid transparent;
    border-radius: calc(var(--lm-radius) - 2px);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  .status.good {
    border-color: #bbf7d0;
    background: #dcfce7;
    color: #166534;
  }
  .status.warning {
    border-color: #fde68a;
    background: #fef3c7;
    color: #854d0e;
  }
  .status.bad {
    border-color: #fecaca;
    background: #fee2e2;
    color: #991b1b;
  }
  .status.working {
    border-color: #bfdbfe;
    background: #dbeafe;
    color: #1e40af;
  }
  .status.neutral {
    border-color: var(--lm-border);
    background: var(--lm-muted);
    color: var(--lm-muted-foreground);
  }
  .token-form {
    display: grid;
    gap: 12px;
    padding: 22px 24px 0;
  }
  .token-form p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }
  .token-form .small {
    color: var(--lm-muted-foreground);
    font-size: 13px;
  }
  .token-form a {
    color: var(--lm-link);
    text-underline-offset: 3px;
  }
  .token-actions {
    margin: 8px -24px 0;
  }
  .error-text {
    margin: 0;
    color: var(--lm-destructive);
    font-size: 13px;
  }
  @media (prefers-color-scheme: dark) {
    .summary {
      color: #86efac;
    }
    .status.good {
      border-color: rgba(34, 197, 94, 0.4);
      background: rgba(22, 163, 74, 0.18);
      color: #86efac;
    }
    .status.warning {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(180, 83, 9, 0.2);
      color: #fde68a;
    }
    .status.bad {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(185, 28, 28, 0.2);
      color: #fca5a5;
    }
    .status.working {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(30, 64, 175, 0.22);
      color: #93c5fd;
    }
  }
  @media (max-width: 620px) {
    .map-row {
      grid-template-columns: 22px minmax(0, 1fr);
    }
    .group-details > span {
      display: none;
    }
    .status {
      grid-column: 2;
      justify-self: start;
    }
  }
</style>
