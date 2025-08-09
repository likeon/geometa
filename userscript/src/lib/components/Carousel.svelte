<script lang="ts">
  export let images: string[] = [];

  let currentIndex = 0;

  function prev() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
  }

  function next() {
    currentIndex = (currentIndex + 1) % images.length;
  }

  // --- Zoom-related state ---
  let containerRef: HTMLDivElement | null = null;
  let imageRef: HTMLImageElement | null = null;
  let isZoomed = false;

  // Mouse position within the container
  let lensX = 0;
  let lensY = 0;

  // Lens and zoom factor
  let lensSize = 150; // diameter of the circular lens
  let scale = 2; // zoom scale

  function handleMouseEnter() {
    isZoomed = true;
  }

  function handleMouseLeave() {
    isZoomed = false;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();

    // Calculate mouse position relative to the container
    lensX = event.clientX - rect.left;
    lensY = event.clientY - rect.top;
  }
</script>

<div class="carousel">
  {#if images.length}
    {#each images as image, index}
      {#if index === currentIndex}
        <div
          class="image-wrapper"
          bind:this={containerRef}
          onmouseenter={handleMouseEnter}
          onmouseleave={handleMouseLeave}
          onmousemove={handleMouseMove}
          role="img"
          aria-label="Zoomable image">
          <img src={image} alt="Image {index + 1}" class="responsive-image" bind:this={imageRef} />

          {#if isZoomed && imageRef}
            <!-- The circular lens overlay -->
            <div
              class="lens"
              style="
                /* Position the lens so the mouse is in its center */
                top: {lensY - lensSize / 2}px;
                left: {lensX - lensSize / 2}px;
                width: {lensSize}px;
                height: {lensSize}px;
                background-image: url({image});
                background-repeat: no-repeat;
                background-size: {imageRef.width * scale}px {imageRef.height * scale}px;
                background-position: {-(lensX * scale - lensSize / 2)}px {-(
                lensY * scale -
                lensSize / 2
              )}px;
              ">
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  {/if}

  {#if images.length > 1}
    <div class="controls">
      <button class="click-area prev-area" onclick={prev} type="button" aria-label="Previous image">
        <span class="prev">&#10094;</span>
      </button>
      <button class="click-area next-area" onclick={next} type="button" aria-label="Next image">
        <span class="next">&#10095;</span>
      </button>
    </div>

    <div class="indicators">
      {#each images as _, index}
        <button
          aria-label={`Switch to image ${index + 1}`}
          class="indicator {index === currentIndex ? 'active' : ''}"
          onclick={() => (currentIndex = index)}></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .carousel {
    position: relative;
    overflow: hidden;
    margin: 0 auto;
  }

  .image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: zoom-in;
  }

  .responsive-image {
    max-width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .lens {
    position: absolute;
    pointer-events: none;
    border: 2px solid #aaa;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
  }

  .click-area {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1.4em;
    cursor: pointer;
  }

  .prev-area {
    left: 0;
  }

  .next-area {
    right: 0;
  }

  .prev,
  .next {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    font-size: 1.2em;
    padding: 0.2em;
    cursor: pointer;
    pointer-events: auto;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .prev {
    left: 0px; /* Visible button position inside the clickable area */
  }

  .next {
    right: 0px; /* Visible button position inside the clickable area */
  }
  .indicators {
    position: absolute;
    bottom: 15px;
    left: 50%; /* Center the indicators container horizontally */
    transform: translateX(-50%); /* Adjust for the container's width */
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px; /* Space between indicator buttons */
  }

  .indicator {
    width: 12px;
    height: 12px;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    padding: 0; /* Remove unnecessary padding */
    flex-shrink: 0; /* Prevent the indicator from shrinking */
  }

  .indicator.active {
    background-color: white;
  }
</style>
