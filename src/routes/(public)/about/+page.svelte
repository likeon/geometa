<script>
	import { Heading } from 'flowbite-svelte';
	import Icon from '@iconify/svelte';
</script>

<svelte:head>
	<title>How To</title>
</svelte:head>

<div id="content" class="container bg-white px-6 py-10 lg:px-8">
	<div class="mx-auto max-w-3xl text-base leading-7 text-gray-700">
		<div class="main-content">
			<p class="text-base font-semibold leading-7 text-green-500">Introducing</p>
			<Heading tag="h1">A Learnable Meta World map</Heading>
			<p>
				When someone wants to improve at GeoGuessr, they often try to memorize lists of bollards,
				signs, Google cars, and other clues. This can be quite overwhelming because there are so
				many different details to remember. I tried teaching my friends some of these "metas" by
				playing the world map with them and pointing out specific clues, but by the time those clues
				appeared again, they had already forgotten them. To help with this, I created a map
				highlighting the most common "metas" - anything from landscapes, bollards, and signs to
				unique Google Street View cars that are useful to learn at the beginning.
			</p>
			<p>
				While there might be other maps like this available, mine includes a script that shows a
				note about the location after you make your guess in GeoGuessr, explaining each round and
				highlighting the clues you might have missed that could help you identify the country.
				Alternatively, as a backup, you can post the location link in the Google Sheet, and it will
				tell you what you missed. The map is designed for No Move/NMPZ (for the rounds with google
				car meta will be harder because it won't be fully visible but, it’s easily doable).
			</p>

			<div class="text-center">
				<a
					href="https://www.geoguessr.com/maps/66c0d3feff4dbe492e06174e"
					target="_blank"
					class="font-bold text-3xl">Map on GeoGuessr</a
				>
			</div>
			<Heading tag="h2" class="mt-4 mb-[-10px]">How to use</Heading>
			<p>
				To get helpful hints in GeoGuessr, you'll need a browser extension that allows you to run
				userscripts, such as
				<strong>Tampermonkey</strong>. If you’ve used other popular userscripts like GeoGuessr
				Training Mode, you might already be familiar with it. But if this is your first time hearing
				about it, don't worry—it's easy to set up.
			</p>
			<Heading tag="h4" class="mt-4 mb-[-20px]">Here's how to do it</Heading>
			<ul role="list" class="mt-8 max-w-xl space-y-4 text-gray-600">
				<li>
					<div class="flex gap-x-3">
						<Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
						<span
							><strong class="font-semibold text-gray-900">Install the Browser Extension.</strong>
							First, you need to install a userscript manager extension for your browser. Tampermonkey
							is available for
							<a
								href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
								target="_blank">Chrome</a
							>* or
							<a href="https://addons.mozilla.org/firefox/addon/tampermonkey" target="_blank"
								>Firefox</a
							>.</span
						>
					</div>
					<p class="text-gray-600 ml-9 italic">
						* - Chrome: <a
							href="https://www.tampermonkey.net/faq.php?locale=en#Q209"
							target="_blank">Enable developer mode</a
						> in extensions to ensure Tampermonkey works properly
					</p>
				</li>
				<li class="flex gap-x-3">
					<Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
					<span
						><strong class="font-semibold text-gray-900">Install the Userscript.</strong>
						Once you have the extension installed, you can install the userscript by clicking
						<a
							href="https://github.com/likeon/geometa/raw/main/dist/geometa.user.js"
							target="_blank">this link</a
						>. Make sure to open new window with geoguessr after installing the script for first
						time.
						<p>
							The userscript is fully open-source and <a
								href="https://github.com/likeon/geometa"
								target="_blank">available on GitHub</a
							>.
						</p>
					</span>
				</li>

				<li class="flex gap-x-3">
					<Icon icon="icon-park-solid:check-one" class="h-6 w-6 flex-shrink-0" color="green" />
					<span
						><strong class="font-semibold text-gray-900">Play the map.</strong>
						Guess a location on
						<a href="https://www.geoguessr.com/maps/66c0d3feff4dbe492e06174e">the map</a>. On the
						results screen, a note will be displayed showing the meta that was in the round, in case
						you missed it.</span
					>
				</li>
			</ul>

			<Heading tag="h4" class="mt-4 mb-[-10px]">An alternative way</Heading>
			<p>
				If, for any reason, you prefer not to use the script, you can opt for a Google Sheet
				instead. You'll need to manually copy the Google Street View URL into the sheet to retrieve
				the information.
			</p>
			<ul role="list" class="mt-8 max-w-xl space-y-4 text-gray-600">
				<li class="flex gap-x-3">
					<Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
					<span
						><strong class="font-semibold text-gray-900"
							>Copy the Google Sheet so you can modify it.</strong
						>
						Open the
						<a
							href="https://docs.google.com/spreadsheets/d/1cQnat5d9DxDX-swSOIZYHdnsnw-b9mBQpa-GA3WQOTU"
							target="_blank">the spreadsheet</a
						>
						and click File -> Make a copy.</span
					>
				</li>
				<li class="flex gap-x-3">
					<Icon icon="icon-park-solid:check-one" class="h-6 w-6 flex-shrink-0" color="green" />
					<span
						><strong class="font-semibold text-gray-900">Play the map.</strong>
						Guess a location on
						<a href="https://www.geoguessr.com/maps/66c0d3feff4dbe492e06174e">the map</a>. On the
						result screen click on the location marker to open Google Street View.</span
					>
				</li>
				<li class="flex gap-x-3">
					<Icon icon="icon-park-solid:check-one" class="h-6 w-6 flex-shrink-0" color="green" />
					<span
						><strong class="font-semibold text-gray-900">Copy the url.</strong>
						Copy the Google Street View url into the main page of your spreadsheet copy, to the right
						of the column named "Enter Link".</span
					>
				</li>
			</ul>

			<p class="font-semibold">
				Feel free to join our <a href="https://discord.gg/AcXEWznYZe" target="_blank"
					>discord server</a
				> if you have any questions or feedback.
			</p>
		</div>
		<Heading tag="h3" class="mt-4">Credits</Heading>
		<p><strong>Map Creator</strong>: trausi</p>
		<p><strong>Spreadsheet Creator</strong>: bastu</p>
		<p><strong>UserScript Creator</strong>: plurk</p>
		<p>
			<strong>Metas and some meta descriptions</strong>:
			<a href="https://www.plonkit.net/" target="_blank">PLONK IT</a>
		</p>
	</div>
</div>

<style lang="postcss">
	.main-content p {
		@apply mt-4;
	}
</style>
