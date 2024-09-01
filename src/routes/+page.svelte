<script lang="ts">
  import background from '$lib/assets/background.jpg?enhanced';
  import GeoIcon from '~icons/wpf/geo-fence'
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<div class="bg-cover bg-center bg-no-repeat relative isolate overflow-hidden bg-white">
<!--  <div style="background-image: url('path/to/your/image.jpg');" class="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true"></div>-->
  <enhanced:img src={background} class="absolute inset-0 -z-10 h-full w-full stroke-gray-200" />
  <div class="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
    <div class="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
      <GeoIcon style="color: dodgerblue" width="2rem" height="2rem"/>
      <h1  style="text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.75);" class="mt-10 text-4xl font-bold tracking-tight text-white sm:text-6xl">New way to learn <span class="whitespace-nowrap">Geo Guessing</span></h1>
      <div class="mt-10 flex items-center gap-x-6">
        <a href="#" class="rounded-md bg-blue-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Get started</a>
        <a href="#" class="text-sm font-semibold leading-6 text-white">Learn more <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <div class="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
      <div class="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
        <div class="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
          <img src="https://tailwindui.com/img/component-images/project-app-screenshot.png" alt="App screenshot" width="2432" height="1442" class="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10">
        </div>
      </div>
    </div>
  </div>
</div>
