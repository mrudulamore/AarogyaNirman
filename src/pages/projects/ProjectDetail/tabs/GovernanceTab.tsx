import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, GitBranch, CalendarClock, TriangleAlert, Landmark } from 'lucide-react';
import type { Project, SiteIssue } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, CardContent, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td, EmptyState, Textarea } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { ROLE_LABELS } from '../../../../lib/constants';
import { formatCurrency, formatDate } from '../../../../lib/utils';

const ISSUE_CATEGORIES: SiteIssue['category'][] = ['LAND', 'UTILITY_SHIFTING', 'PERMISSION_DELAY', 'DRAWING_DELAY', 'MATERIAL_SHORTAGE', 'HOSPITAL_OPERATIONAL_CONSTRAINT', 'OTHER'];

export function GovernanceTab({ project }: { project: Project }) {
  const currentUser = useStore((s) => s.currentUser);
  const users = useStore((s) => s.users);
  const contractors = useStore((s) => s.contractors);
  const changeOrders = useStore((s) => s.changeOrders).filter((c) => c.projectId === project.id);
  const eots = useStore((s) => s.extensionsOfTime).filter((e) => e.projectId === project.id);
  const siteIssues = useStore((s) => s.siteIssues).filter((i) => i.projectId === project.id);
  const decideChangeOrder = useStore((s) => s.decideChangeOrder);
  const decideExtensionOfTime = useStore((s) => s.decideExtensionOfTime);
  const raiseSiteIssue = useStore((s) => s.raiseSiteIssue);
  const resolveSiteIssue = useStore((s) => s.resolveSiteIssue);

  const canApprove = currentUser?.role === 'COMMISSIONER' || currentUser?.role === 'EXECUTIVE_ENGINEER' || currentUser?.role === 'CIVIL_SURGEON';
  const canRaiseIssue = currentUser?.role === 'DEPUTY_ENGINEER' || currentUser?.role === 'EXECUTIVE_ENGINEER' || currentUser?.role === 'CONTRACTOR';

  const [issueOpen, setIssueOpen] = useState(false);
  const [form, setForm] = useState({ category: 'LAND' as SiteIssue['category'], description: '', impact: 'SCHEDULE' as SiteIssue['impact'] });

  const ee = users.find((u) => u.id === project.executiveEngineerId);
  const ownerDirector = users.find((u) => u.id === project.ownerDirectorId);
  const projectManager = users.find((u) => u.id === project.projectManagerId);
  const contractor = contractors.find((c) => c.id === project.contractorId);
  const approvedChangeValue = changeOrders.filter((c) => c.status === 'APPROVED').reduce((s, c) => s + c.costImpact, 0);
  const currentApprovedCost = project.sanctionedBudget + approvedChangeValue;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Landmark size={15} /> Project Governance Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-5 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <GField label="Administrative Approval" value={formatDate(project.startDate)} />
          <GField label="Technical Sanction" value={formatDate(project.startDate)} />
          <GField label="Original Project Cost" value={formatCurrency(project.sanctionedBudget)} />
          <GField label="Current Approved Cost" value={formatCurrency(currentApprovedCost)} tone={approvedChangeValue !== 0 ? 'amber' : undefined} />
          <GField label="Original Completion" value={formatDate(project.originalCompletionDate)} />
          <GField label="Current Completion" value={formatDate(project.plannedCompletionDate)} tone={project.plannedCompletionDate !== project.originalCompletionDate ? 'amber' : undefined} />
          <GField label="Funding Scheme" value={project.scheme} />
          <GField label="Facility Type" value={project.facilityType} />
          <GField label="Current Project Authority" value={ROLE_LABELS.COMMISSIONER} />
          <GField label="Executing Authority" value="Public Works Department (Health Wing)" />
          <GField label="Project Owner / Director" value={ownerDirector?.name ?? '—'} />
          <GField label="Project Manager" value={projectManager?.name ?? '—'} />
          <GField label="Executive Engineer" value={ee?.name ?? '—'} />
          <GField label="Contractor" value={contractor?.company ?? '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch size={15} /> Change / Variation Orders</CardTitle></CardHeader>
        {changeOrders.length === 0 ? <EmptyState title="No change orders raised for this project" /> : (
          <Table>
            <THead><Tr><Th>Title</Th><Th>Cost Impact</Th><Th>Schedule Impact</Th><Th>Requested By</Th><Th>Date</Th><Th>Status</Th><Th /></Tr></THead>
            <TBody>
              {changeOrders.map((c) => (
                <Tr key={c.id}>
                  <Td className="max-w-[220px] truncate font-medium text-slate-800">{c.title}</Td>
                  <Td className={c.costImpact >= 0 ? 'text-amber-600' : 'text-emerald-600'}>{c.costImpact >= 0 ? '+' : ''}{formatCurrency(c.costImpact)}</Td>
                  <Td>{c.scheduleImpactDays > 0 ? `+${c.scheduleImpactDays} days` : 'None'}</Td>
                  <Td>{c.requestedBy}</Td>
                  <Td>{formatDate(c.requestedDate)}</Td>
                  <Td><StatusBadge status={c.status} label={c.status.replace(/_/g, ' ')} /></Td>
                  <Td className="whitespace-nowrap">
                    {c.status === 'PENDING_APPROVAL' && canApprove && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="success" onClick={() => { decideChangeOrder(c.id, 'APPROVED'); toast.success('Change order approved.'); }}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => { decideChangeOrder(c.id, 'REJECTED'); toast.error('Change order rejected.'); }}>Reject</Button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock size={15} /> Extension of Time Requests</CardTitle></CardHeader>
        {eots.length === 0 ? <EmptyState title="No extension of time requests for this project" /> : (
          <Table>
            <THead><Tr><Th>Reason</Th><Th>Days Requested</Th><Th>Requested By</Th><Th>Recommendation</Th><Th>Status</Th><Th /></Tr></THead>
            <TBody>
              {eots.map((e) => (
                <Tr key={e.id}>
                  <Td className="font-medium text-slate-800">{e.reason}</Td>
                  <Td>{e.daysRequested} days{e.approvedDays !== undefined ? ` (${e.approvedDays} approved)` : ''}</Td>
                  <Td>{e.requestedBy}</Td>
                  <Td className="max-w-[220px] truncate">{e.recommendation ?? '—'}</Td>
                  <Td><StatusBadge status={e.status} /></Td>
                  <Td className="whitespace-nowrap">
                    {(e.status === 'PENDING' || e.status === 'RECOMMENDED') && canApprove && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="success" onClick={() => { decideExtensionOfTime(e.id, 'APPROVED'); toast.success('EOT approved — completion date revised.'); }}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => { decideExtensionOfTime(e.id, 'REJECTED'); toast.error('EOT rejected.'); }}>Reject</Button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TriangleAlert size={15} /> Site Issue / Hindrance Register</CardTitle>
          {canRaiseIssue && <Button size="sm" onClick={() => setIssueOpen(true)}><Plus size={13} /> Raise Issue</Button>}
        </CardHeader>
        {siteIssues.length === 0 ? <EmptyState title="No site issues or hindrances recorded" /> : (
          <Table>
            <THead><Tr><Th>Category</Th><Th>Description</Th><Th>Owner</Th><Th>Raised</Th><Th>Target Resolution</Th><Th>Status</Th><Th /></Tr></THead>
            <TBody>
              {siteIssues.map((i) => (
                <Tr key={i.id}>
                  <Td>{i.category.replace(/_/g, ' ')}</Td>
                  <Td className="max-w-[260px] truncate">{i.description}</Td>
                  <Td>{i.owner}</Td>
                  <Td>{formatDate(i.raisedDate)}</Td>
                  <Td>{i.targetResolutionDate ? formatDate(i.targetResolutionDate) : '—'}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                  <Td>
                    {i.status !== 'RESOLVED' && canRaiseIssue && (
                      <Button size="sm" variant="outline" onClick={() => { resolveSiteIssue(i.id); toast.success('Marked resolved.'); }}>Resolve</Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent title="Raise Site Issue / Hindrance" description={project.name}>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Category</p>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as SiteIssue['category'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ISSUE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">Description</p><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Impact</p>
              <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v as SiteIssue['impact'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULE">Schedule</SelectItem>
                  <SelectItem value="COST">Cost</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                  <SelectItem value="NONE">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.description.trim()) { toast.error('Description required.'); return; }
              raiseSiteIssue({ projectId: project.id, category: form.category, description: form.description, raisedBy: currentUser?.name ?? 'Field Team', raisedDate: new Date().toISOString().slice(0, 10), owner: currentUser?.name ?? 'Executive Engineer', targetResolutionDate: undefined, impact: form.impact });
              toast.success('Site issue raised.'); setIssueOpen(false); setForm({ category: 'LAND', description: '', impact: 'SCHEDULE' });
            }}>Raise Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GField({ label, value, tone }: { label: string; value: string; tone?: 'amber' }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 font-medium ${tone === 'amber' ? 'text-amber-700' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}
