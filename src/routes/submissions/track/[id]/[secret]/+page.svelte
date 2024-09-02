<script lang="ts">
	export let data;
</script>

<svelte:head>
	<title>Community Submission status</title>
</svelte:head>


<div id="content" class="bg-white px-6 py-10 lg:px-8 mt-[70px]">
	<div class="mx-auto max-w-3xl text-base leading-7 text-gray-700">
		<p><strong>URL</strong>: <a href="{data.submission.url}" target="_blank">{data.submission.url}</a></p>
		<p><strong>Description</strong>: {data.submission.description}</p>
		<p><strong>Status</strong>: {data.submission.status}</p>
	</div>
</div>
