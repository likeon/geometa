<script>
	import { Button } from 'flowbite-svelte';
	import Icon from '@iconify/svelte';

	export let data;
</script>

<svelte:head>
	<title>Community Submissions</title>
</svelte:head>

<div id="content" class="bg-white px-6 py-10 lg:px-8 mt-[70px]">
	<div class="mx-auto max-w-3xl text-base leading-7 text-gray-700">
		<h1 class="text-3xl">Community Submissions</h1>
		<Button class="mt-4" href="/submissions/submit">
			<Icon icon="gis:poi-map" color="white" class="mr-3 h-4 w-4" />
			Submit a location to be added on the map!
		</Button>
		<h2 class="mt-3 text-xl text-green-600">Leaderboard</h2>
		<p class="text-gray-700 text-sm">Includes only approved submissions</p>
		<div class="mt-2 flow-root">
			<div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
				<div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
					<div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
						<table class="min-w-full divide-y divide-gray-300">
							<thead class="bg-gray-50">
							<tr>
								<th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nickname
								</th>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Accepted Submissions
								</th>
							</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
							{#each data.aggregatedSubmissions as row }
								<tr>
									<td
										class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{row.authorNickname}
									</td>
									<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{row.submissionsCount}</td>
								</tr>
							{/each}
							<!-- More people... -->
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>

	</div>
</div>
