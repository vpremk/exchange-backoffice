import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Copy, Eye, EyeOff, Key, Plus, Save, Trash2, Users, Bell, Code } from "lucide-react";

// ── API Keys ─────────────────────────────────────────────────────────

function ApiKeySection() {
  const [keys] = useState([
    { id: "1", name: "Production SDK", prefix: "sk-prod-...a4f2", created: "2024-11-15", lastUsed: "2 hours ago" },
    { id: "2", name: "Staging SDK", prefix: "sk-stg-...b8c1", created: "2024-12-01", lastUsed: "3 days ago" },
    { id: "3", name: "CI Pipeline", prefix: "sk-ci-...9e3d", created: "2025-01-10", lastUsed: "1 hour ago" },
  ]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Key className="h-4 w-4" />API Keys</CardTitle>
          <CardDescription>Manage SDK authentication keys</CardDescription>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Create Key</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{key.prefix}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">Last used: {key.lastUsed}</span>
                <Button variant="ghost" size="sm"><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Rule Editor ──────────────────────────────────────────────────────

function RuleEditorSection() {
  const [yaml, setYaml] = useState(`rules:
  - id: CUSTOM-001
    name: Example Rule
    description: Ensure data operations have classification
    severity: medium
    regulation: custom
    conditions:
      - field: "trace.spans[*].attributes.classification"
        operator: "is_empty"
    logic: "all"
    actions:
      - type: alert
        channel: slack
        priority: P3
`);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Code className="h-4 w-4" />Rule Configuration</CardTitle>
          <CardDescription>Edit compliance rules (YAML)</CardDescription>
        </div>
        <Button size="sm"><Save className="h-4 w-4 mr-1" />Save Rules</Button>
      </CardHeader>
      <CardContent>
        <textarea
          className="w-full h-64 font-mono text-sm bg-muted/50 border rounded-lg p-4 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={yaml}
          onChange={(e) => setYaml(e.target.value)}
          spellCheck={false}
        />
      </CardContent>
    </Card>
  );
}

// ── Alert Channels ───────────────────────────────────────────────────

function AlertChannelSection() {
  const [channels] = useState([
    { id: "1", type: "Slack", target: "#compliance-alerts", enabled: true },
    { id: "2", type: "PagerDuty", target: "compliance-sentinel", enabled: true },
    { id: "3", type: "Email", target: "compliance@company.com", enabled: false },
    { id: "4", type: "Webhook", target: "https://hooks.internal/sentinel", enabled: true },
  ]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" />Alert Channels</CardTitle>
          <CardDescription>Configure notification destinations</CardDescription>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Channel</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {channels.map((ch) => (
            <div key={ch.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Badge variant={ch.enabled ? "default" : "secondary"}>{ch.type}</Badge>
                <span className="text-sm font-mono">{ch.target}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ch.enabled ? "default" : "outline"} className="text-xs">
                  {ch.enabled ? "Active" : "Disabled"}
                </Badge>
                <Button variant="ghost" size="sm"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── User Management ──────────────────────────────────────────────────

function UserManagementSection() {
  const [users] = useState([
    { id: "1", name: "Alice Chen", email: "alice@company.com", role: "Admin" },
    { id: "2", name: "Bob Patel", email: "bob@company.com", role: "Compliance Officer" },
    { id: "3", name: "Carol Davis", email: "carol@company.com", role: "Developer" },
    { id: "4", name: "David Kim", email: "david@company.com", role: "Viewer" },
  ]);

  const roleBadge: Record<string, string> = {
    Admin: "bg-purple-100 text-purple-700",
    "Compliance Officer": "bg-blue-100 text-blue-700",
    Developer: "bg-green-100 text-green-700",
    Viewer: "bg-gray-100 text-gray-700",
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Users & Roles</CardTitle>
          <CardDescription>Manage team access</CardDescription>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Invite User</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge className={cn("text-xs", roleBadge[user.role])}>{user.role}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tenant Settings ──────────────────────────────────────────────────

function TenantSettingsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Settings</CardTitle>
        <CardDescription>Organization configuration</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Tenant Name</label>
            <Input defaultValue="healthcare-division" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Tenant ID</label>
            <Input defaultValue="tenant-hc-001" disabled className="mt-1 bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium">Default Regulations</label>
            <Input defaultValue="HIPAA, SOC2" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Data Retention (days)</label>
            <Input type="number" defaultValue="365" className="mt-1" />
          </div>
        </div>
        <Button className="mt-4" size="sm"><Save className="h-4 w-4 mr-1" />Save Settings</Button>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ApiKeySection />
      <RuleEditorSection />
      <AlertChannelSection />
      <UserManagementSection />
      <TenantSettingsSection />
    </div>
  );
}
