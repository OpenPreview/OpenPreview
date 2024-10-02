import { createClient } from '@openpreview/db/server';
import { CodeBlock } from '@openpreview/ui/components/code-block';
import { Separator } from '@openpreview/ui/components/separator';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Development',
  description:
    'Access script tags and development tools for your OpenPreview app.',
};

interface DevelopmentPageProps {
  params: {
    organizationSlug: string;
    projectSlug: string;
  };
}

async function getProjectDetails(
  organizationSlug: string,
  projectSlug: string,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('slug', projectSlug)
    .single();

  if (error) throw error;
  return data;
}

export default async function DevelopmentPage({
  params,
}: DevelopmentPageProps) {
  const project = await getProjectDetails(
    params.organizationSlug,
    params.projectSlug,
  );
  const scriptTag = `<script>
  window.opv = window.opv||function(...args){(window.opv.q=window.opv.q||[]).push(args);};
  window.opv('init', {
    clientId: '${project.id}'
  });
</script>
<script src="https://cdn.openpreview.dev/opv.js" defer async></script>`;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Development</h2>
        <p className="text-muted-foreground">
          Access script tags and development tools for your OpenPreview app.
        </p>
      </div>
      <Separator />
      <div>
        <h3 className="mb-2 text-xl font-semibold">Script Tag</h3>
        <p className="text-muted-foreground mb-4">
          Add this script tag to your website to enable OpenPreview
          functionality.
        </p>
        <CodeBlock
          filename="script-tag.html"
          code={scriptTag}
          language="html"
        />
      </div>
      <div>
        <h3 className="mb-2 text-xl font-semibold">Development Tools</h3>
        <p className="text-muted-foreground mb-4">
          Additional tools and resources for developing with OpenPreview.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <a
              href="https://docs.openpreview.dev"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </a>
          </li>
          <li>
            <a
              href="https://github.com/openpreview/openpreview"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Repository
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
