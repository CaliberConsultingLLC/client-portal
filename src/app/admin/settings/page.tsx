import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Platform configuration and integrations.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SurveyMonkey Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API Token"
              type="password"
              placeholder="Enter your SurveyMonkey API token"
              disabled
            />
            <p className="text-xs text-text-muted">
              API token is managed via environment variables for security.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="From Address"
              type="email"
              placeholder="noreply@northstarpartners.org"
              disabled
            />
            <p className="text-xs text-text-muted">
              Email settings are configured via environment variables.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
