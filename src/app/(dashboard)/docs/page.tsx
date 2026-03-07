import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>Product blueprint and implementation references.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The main functional scope is documented in `docs/blueprint.md`. Use this page as a quick entry point for local docs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
