import rehypeExternalLinks from 'rehype-external-links';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeExternalLinks, { target: '_blank' })
  .use(rehypeStringify)
  .freeze();

export async function markdown2Html(markdown: string) {
  const vfile = await processor.process(markdown);
  return String(vfile);
}
