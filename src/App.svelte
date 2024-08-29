<script lang="ts">
  import {onMount} from 'svelte';
  import {GM_xmlhttpRequest} from '$';
  import Spinner from "./lib/Spinner.svelte";
  import CountryFlag from "./lib/CountryFlag.svelte";

  export let lat: number = 0;
  export let lng: number = 0;

  type GeoInfo = {
    url: string,
    country: string,
    type: string,
    notes: string
  }[];

  let geoInfo: GeoInfo | null = null;
  let error: string | null = null;

  onMount(() => {
    const roundedLat = lat.toFixed(2);
    const roundedLng = lng.toFixed(2);
    const url = `https://geometa-info-service.i-a38.workers.dev/?coordinates=${roundedLat},${roundedLng}`;

    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: (response) => {
        if (response.status === 200) {
          try {
            geoInfo = JSON.parse(response.responseText);
          } catch (e) {
            error = 'Failed to parse response';
          }
        } else if (response.status === 404) {
          error = 'Meta for this location not found';
        } else {
          error = `HTTP error! status: ${response.status}`;
        }
      },
      onerror: (e) => {
        error = 'An error occurred while fetching data';
        console.error('Error:', e);
      }
    });
  });
</script>

<div class="geometa-container">
  <h2>GeoMeta</h2>
  {#if error}
    <p>Error: {error}</p>
  {:else if geoInfo}
    {#each geoInfo as geoItem, index}
      {#if index !== 0}
        <hr>
      {/if}
      <p>Country:
        <CountryFlag countryName={geoItem.country}/>
        <strong>{geoItem.country}</strong></p>
      <p>Meta type: <strong>{geoItem.type}</strong></p>
      <p>Notes: {geoItem.notes}</p>
    {/each}
  {:else}
    <Spinner/>
  {/if}
</div>

<style>
  .geometa-container {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 1rem;
    z-index: 9;
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
    background: var(--ds-color-purple-100);
    padding: 6px 10px;
    border-radius: 5px;
    font-size: 12px;
    opacity: 0.75;
    width: min(25%, 500px);
    max-width: min(25%, 500px);
  }
</style>
