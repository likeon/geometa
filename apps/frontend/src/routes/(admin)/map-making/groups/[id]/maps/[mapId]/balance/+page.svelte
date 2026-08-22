<script lang="ts">
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import Icon from '@iconify/svelte';

  let { data } = $props();

  const balance = $derived(data.balance);
  const metas = $derived(balance.metas);
  const totalLinks = $derived(metas.reduce((sum, meta) => sum + meta.links, 0));
  const metasPerLocation = $derived(
    balance.totalLocations ? totalLinks / balance.totalLocations : 0
  );
  // the yardstick has to be this map's own average: a 26-meta map simply can't
  // give every meta a big share, so a fixed percentage would flag all of them
  const averageShare = $derived(metas.length ? metasPerLocation / metas.length : 0);

  const ROUNDS = 5;
  function seenInGame(share: number) {
    return 1 - (1 - share) ** ROUNDS;
  }
  function pct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  type Flag = { label: string; variant: 'destructive' | 'secondary'; title: string };
  function flagsFor(meta: (typeof metas)[number]): Flag[] {
    const flags: Flag[] = [];
    if (averageShare > 0 && meta.share < averageShare * 0.5) {
      flags.push({
        label: 'rarely drawn',
        variant: 'destructive',
        title: `Appears on less than half as many locations as the average meta in this map (${pct(averageShare)}).`
      });
    }
    if (averageShare > 0 && meta.share > averageShare * 2) {
      flags.push({
        label: 'dominates',
        variant: 'secondary',
        title: `Appears on more than twice as many locations as the average meta in this map (${pct(averageShare)}).`
      });
    }
    if (meta.links > 0 && meta.exclusive === 0) {
      flags.push({
        label: 'never alone',
        variant: 'destructive',
        title:
          'Every location for this meta is shared with another meta in this map, so it is never the only thing shown and may not get the player’s full attention.'
      });
    }
    return flags;
  }

  const underExposed = $derived(metas.filter((meta) => flagsFor(meta).length > 0).length);
</script>

<div class="space-y-4">
  <a
    href="/map-making/groups/{data.groupId}/maps"
    class="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
    <Icon icon="mdi:arrow-left" class="w-4 h-4 mr-1" />
    Back to maps
  </a>

  <div>
    <h4 class="text-lg font-semibold">Meta balance — {balance.mapName}</h4>
    <p class="text-sm text-muted-foreground">
      How often each meta turns up for a player, based on the locations that are actually in this
      map right now. Includes changes you haven't synced yet.
    </p>
  </div>

  {#if balance.totalLocations === 0}
    <p class="text-sm text-muted-foreground">This map has no locations yet.</p>
  {:else}
    <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <span><strong>{balance.totalLocations}</strong> locations</span>
      <span><strong>{metas.length}</strong> metas</span>
      <span><strong>{metasPerLocation.toFixed(2)}</strong> metas per location</span>
      <span class="text-muted-foreground">average share {pct(averageShare)}</span>
      {#if underExposed > 0}
        <span class="text-muted-foreground">{underExposed} flagged</span>
      {/if}
    </div>

    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Meta</Table.Head>
          <Table.Head class="text-right w-[110px]">Locations</Table.Head>
          <Table.Head class="text-right w-[110px]">Only this</Table.Head>
          <Table.Head class="w-[220px]">Share of rounds</Table.Head>
          <Table.Head class="text-right w-[130px]">Seen in {ROUNDS} rounds</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each metas as meta (meta.id)}
          {@const flags = flagsFor(meta)}
          <Table.Row>
            <Table.Cell>
              <div class="font-medium">{meta.name || meta.tagName}</div>
              <div class="text-xs text-muted-foreground">{meta.tagName}</div>
              {#if flags.length}
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each flags as flag (flag.label)}
                    <span title={flag.title}>
                      <Badge variant={flag.variant} class="text-[10px]">{flag.label}</Badge>
                    </span>
                  {/each}
                </div>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">{meta.links}</Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {meta.exclusive}
              {#if meta.shared > 0}
                <span class="text-xs text-muted-foreground">(+{meta.shared} shared)</span>
              {/if}
            </Table.Cell>
            <Table.Cell>
              <div class="flex items-center gap-2">
                <div class="h-2 flex-1 rounded bg-muted overflow-hidden">
                  <div
                    class="h-full rounded bg-primary"
                    style="width: {Math.min(100, meta.share * 100)}%">
                  </div>
                </div>
                <span class="tabular-nums text-xs w-12 text-right">{pct(meta.share)}</span>
              </div>
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">{pct(seenInGame(meta.share))}</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

    <div class="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1 max-w-3xl">
      <p>
        <strong>Share of rounds</strong> is a meta's locations divided by the map's total locations —
        the chance a random round shows it. Metas sharing a location all get credit for it, so the shares
        add up to more than 100% when locations carry several metas.
      </p>
      <p>
        <strong>Only this</strong> counts locations where this meta is the only one this map includes.
        Those are the ones you can freely add or remove to tune a meta without moving another, and they're
        the only times the meta gets the player's undivided attention.
      </p>
      <p>
        Flags compare against this map's own average, so they stay meaningful whether it has 3 metas
        or 30.
      </p>
    </div>
  {/if}
</div>
