<script lang="ts">
  import { onMount } from 'svelte';
  import { GM_xmlhttpRequest } from '$';
  import Spinner from './components/Spinner.svelte';
  import CountryFlag from './components/CountryFlag.svelte';
  import { onPointerDown, onPointerMove, onPointerUp, setContainerPosition } from './utils/dragging';
  import { saveContainerDimensions, setContainerDimensions } from './utils/resizing';
  import Carousel from './components/Carousel.svelte';
  import { checkIfOutdated, getLatestVersionInfo, markHelpMessageAsRead, wasHelpMessageRead } from './utils/main';

  interface Props {
    panoId: string;
    mapId: string;
  }

  let { panoId, mapId }: Props = $props();

  type GeoInfo = {
    country: string;
    metaName: string;
    note: string;
    plonkitCountryUrl: string;
    images?: string[];
    footer: string;
  };

  let geoInfo: GeoInfo | null = $state(null);
  let error: string | null = $state(null);

  let container: HTMLDivElement;
  let header: HTMLDivElement;

  onMount(() => {
    const url = `https://learnablemeta.com/location-info?panoId=${panoId}&mapId=${mapId}`;

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

    setContainerPosition(container);
    setContainerDimensions(container);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        saveContainerDimensions(entry);
      }
    });
    resizeObserver.observe(container);

    header.addEventListener('pointerdown', (event) => onPointerDown(event, container));
    document.addEventListener('pointermove', (event) => onPointerMove(event, container));
    document.addEventListener('pointerup', (event) => onPointerUp(event, container));

    return () => {
      resizeObserver.disconnect();
      header.removeEventListener('pointerdown', (event) => onPointerDown(event, container));
      document.removeEventListener('pointermove', (event) => onPointerMove(event, container));
      document.removeEventListener('pointerup', (event) => onPointerUp(event, container));
    };
  });

  function confirmNavigation(event: any) {
    event.preventDefault();
    currentUrl = event.currentTarget.href;
    showModal = true;
  }

  function proceed() {
    showModal = false;
    window.open(currentUrl, '_blank');
  }

  function cancel() {
    showModal = false;
  }

  let showModal = $state(false);
  let currentUrl = $state('');
  let showHelpPopup = $state(false);
  let helpClass = $state('question-mark-icon');

  function shouldBlink() {
    return !wasHelpMessageRead() || checkIfOutdated();
  }

  function updateHelpClass() {
    helpClass = shouldBlink() ? 'question-mark-icon blink' : 'question-mark-icon';
  }

  function togglePopup() {
    showHelpPopup = !showHelpPopup;
    if (showHelpPopup) {
      markHelpMessageAsRead();
      updateHelpClass();
    }
  }

  updateHelpClass();

  $effect(() => {
    if (geoInfo) {
      const links = document.querySelectorAll('.geometa-footer a, .geometa-note a');
      links.forEach((link) => {
        link.removeEventListener('click', confirmNavigation);
        link.addEventListener('click', confirmNavigation);
      });
    }
  });

</script>

<div class="geometa-container" bind:this={container}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex header" bind:this={header}>
    <h2>Learnable Meta</h2>
    <div class="icons">
      <a href={"https://learnablemeta.com/maps/" + mapId } target="_blank" aria-label="List of map metas">
        <span class="skill-icons--list"></span>
      </a>
      <a href="https://learnablemeta.com/" target="_blank" aria-label="Learnable Meta website">
        <span class="flat-color-icons--globe"></span>
      </a>
      <a href="https://discord.gg/AcXEWznYZe" target="_blank" aria-label="Learnable Meta discord">
        <span class="skill-icons--discord"></span>
      </a>
      <button onclick={togglePopup} aria-label="More information" style="background: none; border: none; padding: 0;">
        <span class={helpClass}></span>
      </button>


    </div>
  </div>
  {#if error}
    <p>Error: {error}</p>
  {:else if geoInfo}
    <p>
      <CountryFlag countryName={geoInfo.country} />
      <strong>{geoInfo.country}</strong> - {geoInfo.metaName}
    </p>
    <div class="geometa-note">
      {@html geoInfo.note}
    </div>
    {#if geoInfo.footer}
      <p class="geometa-footer">
        {@html geoInfo.footer}
      </p>
    {/if}
    {#if geoInfo.images && geoInfo.images.length}
      <hr />
      <Carousel images={geoInfo.images} />
    {/if}
  {:else}
    <Spinner />
  {/if}

  {#if showModal}
    <div class="modal-backdrop">
      <div class="modal">
        <p>You are about to open this site in a new tab:</p>
        <p class="modal-url">{currentUrl}</p>
        <div class="modal-buttons">
          <button onclick={proceed} class="proceed-btn">Continue</button>
          <button onclick={cancel} class="close-btn">Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showHelpPopup}
    <div class="modal-backdrop">
      <div class="modal">
        <div class="help-message">
          {#if checkIfOutdated()}
            <p class="outdated"><strong>Your script version is out of date - please install the latest
              version ({getLatestVersionInfo()})!
            </strong></p>
          {/if}
          <p>Welcome to LearnableMeta, we hope you are enjoying it, some quick info:</p>
          <ul>
            <li><strong>Drag to Move:</strong> Click and drag the top of the note to reposition it anywhere on your
              screen.
            </li>
            <li><strong>Resize:</strong> Use the bottom-right corner to resize the note to your liking.</li>
            <li><strong>View Map metalist:</strong> Click the list icon to see all the metas included in the map you
              are currently playing.
            </li>
            <li><strong>Join the Community:</strong> Click the Discord icon to share feedback, suggest improvements, or
              just say hi!
            </li>
            <li>
              <strong>Outdated Script:</strong> The question mark icon will blink if the script is outdated.
            </li>
          </ul>
        </div>
        <button class="close-btn" onclick={togglePopup}>Close</button>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.geometa-footer a) {
    color: #188bd2;
    text-decoration: none;
  }

  :global(.geometa-footer a:hover) {
    text-decoration: underline;
  }

  .geometa-container {
    position: absolute;
    top: 13rem;
    left: 1rem;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
    background: var(--ds-color-purple-100);
    padding: 6px 10px;
    border-radius: 5px;
    font-size: 17px;
    width: min(25%, 500px);

    resize: both;
    overflow: auto;
  }

  .geometa-footer {
    color: #d3d3d3;
    font-size: small;
  }

  a {
    color: #188bd2;
  }

  a:hover {
    text-decoration: underline;
  }

  .skill-icons--discord {
    display: inline-block;
    width: 1.2rem;
    height: 1.2rem;
    margin-left: 2px;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cg fill='none'%3E%3Crect width='256' height='256' fill='%235865f2' rx='60'/%3E%3Cg clip-path='url(%23skillIconsDiscord0)'%3E%3Cpath fill='%23ffffff' d='M197.308 64.797a165 165 0 0 0-40.709-12.627a.62.62 0 0 0-.654.31c-1.758 3.126-3.706 7.206-5.069 10.412c-15.373-2.302-30.666-2.302-45.723 0c-1.364-3.278-3.382-7.286-5.148-10.412a.64.64 0 0 0-.655-.31a164.5 164.5 0 0 0-40.709 12.627a.6.6 0 0 0-.268.23c-25.928 38.736-33.03 76.52-29.546 113.836a.7.7 0 0 0 .26.468c17.106 12.563 33.677 20.19 49.94 25.245a.65.65 0 0 0 .702-.23c3.847-5.254 7.276-10.793 10.217-16.618a.633.633 0 0 0-.347-.881c-5.44-2.064-10.619-4.579-15.601-7.436a.642.642 0 0 1-.063-1.064a86 86 0 0 0 3.098-2.428a.62.62 0 0 1 .646-.088c32.732 14.944 68.167 14.944 100.512 0a.62.62 0 0 1 .655.08a80 80 0 0 0 3.106 2.436a.642.642 0 0 1-.055 1.064a102.6 102.6 0 0 1-15.609 7.428a.64.64 0 0 0-.339.889a133 133 0 0 0 10.208 16.61a.64.64 0 0 0 .702.238c16.342-5.055 32.913-12.682 50.02-25.245a.65.65 0 0 0 .26-.46c4.17-43.141-6.985-80.616-29.571-113.836a.5.5 0 0 0-.26-.238M94.834 156.142c-9.855 0-17.975-9.047-17.975-20.158s7.963-20.158 17.975-20.158c10.09 0 18.131 9.127 17.973 20.158c0 11.111-7.962 20.158-17.973 20.158m66.456 0c-9.855 0-17.974-9.047-17.974-20.158s7.962-20.158 17.974-20.158c10.09 0 18.131 9.127 17.974 20.158c0 11.111-7.884 20.158-17.974 20.158'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='skillIconsDiscord0'%3E%3Cpath fill='%23ffffff' d='M28 51h200v154.93H28z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/g%3E%3C/svg%3E");
  }

  .flat-color-icons--globe {
    display: inline-block;
    width: 1.2rem;
    height: 1.2rem;
    margin-left: 2px;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%237cb342' d='M24 4C13 4 4 13 4 24s9 20 20 20s20-9 20-20S35 4 24 4'/%3E%3Cpath fill='%230277bd' d='M45 24c0 11.7-9.5 21-21 21S3 35.7 3 24S12.3 3 24 3s21 9.3 21 21m-21.2 9.7c0-.4-.2-.6-.6-.8c-1.3-.4-2.5-.4-3.6-1.5c-.2-.4-.2-.8-.4-1.3c-.4-.4-1.5-.6-2.1-.8h-4.2c-.6-.2-1.1-1.1-1.5-1.7c0-.2 0-.6-.4-.6c-.4-.2-.8.2-1.3 0c-.2-.2-.2-.4-.2-.6c0-.6.4-1.3.8-1.7c.6-.4 1.3.2 1.9.2c.2 0 .2 0 .4.2c.6.2.8 1 .8 1.7v.4c0 .2.2.2.4.2c.2-1.1.2-2.1.4-3.2c0-1.3 1.3-2.5 2.3-2.9c.4-.2.6.2 1.1 0c1.3-.4 4.4-1.7 3.8-3.4c-.4-1.5-1.7-2.9-3.4-2.7c-.4.2-.6.4-1 .6c-.6.4-1.9 1.7-2.5 1.7c-1.1-.2-1.1-1.7-.8-2.3c.2-.8 2.1-3.6 3.4-3.1l.8.8c.4.2 1.1.2 1.7.2c.2 0 .4 0 .6-.2s.2-.2.2-.4c0-.6-.6-1.3-1-1.7s-1.1-.8-1.7-1.1c-2.1-.6-5.5.2-7.1 1.7s-2.9 4-3.8 6.1c-.4 1.3-.8 2.9-1 4.4c-.2 1-.4 1.9.2 2.9c.6 1.3 1.9 2.5 3.2 3.4c.8.6 2.5.6 3.4 1.7c.6.8.4 1.9.4 2.9c0 1.3.8 2.3 1.3 3.4c.2.6.4 1.5.6 2.1c0 .2.2 1.5.2 1.7c1.3.6 2.3 1.3 3.8 1.7c.2 0 1-1.3 1-1.5c.6-.6 1.1-1.5 1.7-1.9c.4-.2.8-.4 1.3-.8c.4-.4.6-1.3.8-1.9c.1-.5.3-1.3.1-1.9m.4-19.4c.2 0 .4-.2.8-.4c.6-.4 1.3-1.1 1.9-1.5s1.3-1.1 1.7-1.5c.6-.4 1.1-1.3 1.3-1.9c.2-.4.8-1.3.6-1.9c-.2-.4-1.3-.6-1.7-.8c-1.7-.4-3.1-.6-4.8-.6c-.6 0-1.5.2-1.7.8c-.2 1.1.6.8 1.5 1.1c0 0 .2 1.7.2 1.9c.2 1-.4 1.7-.4 2.7c0 .6 0 1.7.4 2.1zM41.8 29c.2-.4.2-1.1.4-1.5c.2-1 .2-2.1.2-3.1c0-2.1-.2-4.2-.8-6.1c-.4-.6-.6-1.3-.8-1.9c-.4-1.1-1-2.1-1.9-2.9c-.8-1.1-1.9-4-3.8-3.1c-.6.2-1 1-1.5 1.5c-.4.6-.8 1.3-1.3 1.9c-.2.2-.4.6-.2.8c0 .2.2.2.4.2c.4.2.6.2 1 .4c.2 0 .4.2.2.4c0 0 0 .2-.2.2c-1 1.1-2.1 1.9-3.1 2.9c-.2.2-.4.6-.4.8s.2.2.2.4s-.2.2-.4.4c-.4.2-.8.4-1.1.6c-.2.4 0 1.1-.2 1.5c-.2 1.1-.8 1.9-1.3 2.9c-.4.6-.6 1.3-1 1.9c0 .8-.2 1.5.2 2.1c1 1.5 2.9.6 4.4 1.3c.4.2.8.2 1.1.6c.6.6.6 1.7.8 2.3c.2.8.4 1.7.8 2.5c.2 1 .6 2.1.8 2.9c1.9-1.5 3.6-3.1 4.8-5.2c1.5-1.3 2.1-3 2.7-4.7'/%3E%3C/svg%3E");
  }

  .skill-icons--list {
    display: inline-block;
    width: 1.2rem;
    height: 1.2rem;
    margin-left: 2px;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235865f2' d='M4 3h13.17c.41 0 .8.16 1.09.44l3.3 3.3c.29.29.44.68.44 1.09V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'/%3E%3Cpath fill='%23ffffff' d='M14 2v4h4l-4-4zM7 9h10v2H7V9zm0 4h7v2H7v-2z'/%3E%3C/svg%3E");
  }

  .question-mark-icon {
    display: inline-block;
    width: 1.2rem;
    height: 1.2rem;
    margin-left: 2px;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23188bd2' d='M21 2H3c-.55 0-1 .45-1 1v18c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1ZM12 18a1 1 0 1 1 1-1a1 1 0 0 1-1 1Zm2.07-5.25c-.9.52-.98 1.26-.98 1.75h-2c0-1.12.46-2.21 1.78-2.91c.9-.52 1.22-.87 1.22-1.34a1.5 1.5 0 0 0-3 0H9a3.5 3.5 0 0 1 7 0c0 1.63-1.28 2.41-1.93 2.75Z'/%3E%3C/svg%3E");
    cursor: pointer; /* Makes it clear that the icon is clickable */
  }


  .icons {
    display: inline-block;
    vertical-align: middle;
  }

  .flex {
    display: flex;
    align-items: center;
  }

  .icons a span {
    align-items: center;
    justify-content: center;
  }

  hr {
    border: 0;
    border-top: 1px solid white;
    width: 100%;
  }

  .header {
    cursor: move;
    border-bottom: 1px solid #aaa;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    touch-action: none;    /* Prevent scroll / other gestures */
    user-select: none;     /* Prevent text selection while dragging */
  }


  :global(.geometa-note a) {
    color: #188bd2;
  }

  :global(.geometa-note a:hover) {
    text-decoration: underline;
  }

  :global(.geometa-note ul li) {
    list-style-type: disc;
    margin-left: 1rem;
  }

  :global(.geometa-note ol li) {
    list-style-type: decimal;
    margin-left: 1rem;
  }


  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(30, 30, 30, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    background: var(--ds-color-purple-100);
    padding: 15px 25px;
    border-radius: 8px;
    text-align: center;
    width: 90%;
    max-width: 600px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    color: #d3d3d3;
  }

  .modal p {
    margin: 0 0 10px;
    font-size: 17px;
  }

  .modal-url {
    font-size: 15px;
    font-weight: bold;
    color: #188bd2;
    word-break: break-word;
    margin: 10px 0;
  }

  .modal-buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
  }

  .proceed-btn {
    background: #188bd2;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 15px;
    transition: background-color 0.2s ease-in-out;
  }

  .proceed-btn:hover {
    background: #0056b3;
  }

  .close-btn {
    background: transparent;
    color: #d3d3d3;
    padding: 8px 16px;
    border: 1px solid #d3d3d3;
    border-radius: 5px;
    cursor: pointer;
    font-size: 15px;
    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
  }

  .close-btn:hover {
    background: #d3d3d3;
    color: var(--ds-color-purple-100);
  }


  button {
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }

  .blink {
    animation: blink-animation 1s infinite;
  }

  .help-message {
    padding: 12px;
    font-size: 16px;
    line-height: 1.5;
    text-align: left;

    strong {
      color: #007bff; /* Slightly darker or brighter blue */
      font-weight: bold;
    }
  }


  @keyframes blink-animation {
    0% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(2);
      background-color: #004779; /* Optional to give a red flash */
    }
    100% {
      filter: brightness(1);
    }
  }

  .outdated strong {
    color: red !important;
  }
</style>
