'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { CardSkeleton, FormSkeleton } from '@/components/shared/Skeleton';
import toast from 'react-hot-toast';

export default function AdminPromptsPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchTemplates();
  }, [authLoading, isAdmin, router]);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/admin/prompts');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to fetch prompt templates');
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    setIsSaving(true);
    try {
      await api.put(`/admin/prompts/${editingTemplate._id}`, {
        template: editingTemplate.template,
        variables: editingTemplate.variables,
      });
      toast.success('Template updated successfully');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.domain?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Prompt Templates</h1>
          <FormSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Prompt Templates</h1>
            <p className="text-muted-foreground">Manage AI prompt templates</p>
          </div>
          <Button variant="outline" onClick={fetchTemplates} className="border-slate-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <Card className="bg-card border-muted">
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-muted border-slate-700"
              />
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        <div className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <Card className="bg-card border-muted">
              <CardContent className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates found</p>
              </CardContent>
            </Card>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template._id} className="bg-card border-muted">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {template.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          {template.domain}
                        </Badge>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          v{template.version}
                        </Badge>
                      </div>
                    </div>
                    {editingTemplate?._id !== template._id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                        className="border-slate-700"
                      >
                        Edit Template
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingTemplate?._id === template._id ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Template</Label>
                        <Textarea
                          value={editingTemplate.template}
                          onChange={(e) => setEditingTemplate(prev => ({ ...prev, template: e.target.value }))}
                          className="mt-2 bg-muted border-slate-700 min-h-[300px] font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Variables</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {editingTemplate.variables?.map((v, i) => (
                            <Badge key={i} variant="outline" className="border-slate-700">
                              {v}
                            </Badge>
                          )) || <span className="text-slate-500">No variables defined</span>}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setEditingTemplate(null)}
                          className="border-slate-700"
                        >
                          Cancel
                        </Button>
                        <Button onClick={saveTemplate} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <pre className="bg-slate-950 p-4 rounded-lg text-sm text-slate-300 overflow-x-auto">
                        <code>{template.template}</code>
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
