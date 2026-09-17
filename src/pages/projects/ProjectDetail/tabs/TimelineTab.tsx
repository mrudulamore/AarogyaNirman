import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { Check, Clock, Circle, Camera, ChevronDown } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent } from '../../../../components/ui/primitives';
import { Dialog, DialogContent } from '../../../../components/ui/overlays';
import { GeoPhoto } from '../../../../components/common/GeoPhoto';
import { photoSrc, formatDate, cn } from '../../../../lib/utils';
import { isMilestoneDelivered } from '../../../../lib/milestones';

type StepState = 'DONE' | 'ACTIVE' | 'PENDING';

interface Step { label: string; date?: string; state: StepState; note?: string; description: string; photoStages: string[] }

export function TimelineTab({ project }: { project: Project }) {
  useUiLanguage();
  const tender = useStore((s) => s.tenders).find((t) => t.id === project.tenderId);
  const milestones = useStore((s) => s.milestones).filter((m) => m.projectId === project.id).sort((a, b) => a.order - b.order);
  const handoverSteps = useStore((s) => s.handoverSteps).filter((h) => h.projectId === project.id);
  const inspections = useStore((s) => s.inspections).filter((i) => i.projectId === project.id);
  const photos = useStore((s) => s.photos).filter((p) => p.projectId === project.id);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const certifiedCount = milestones.filter((m) => isMilestoneDelivered(m.status)).length;
  const inspectionsDone = inspections.filter((i) => i.status === 'COMPLETED').length;
  const handoverComplete = handoverSteps.length > 0 && handoverSteps.every((h) => h.status === 'COMPLETED');
  const handoverStarted = handoverSteps.some((h) => h.status !== 'PENDING');

  const steps: Step[] = [
    { label: 'Administrative Approval', date: tender?.publishDate, state: 'DONE', note: 'Sanctioned under the state hospital infrastructure programme.', description: `Administrative approval accorded for "${project.name}" under the ${project.scheme} scheme, formally authorising the project to proceed to technical sanction and tendering.`, photoStages: [] },
    { label: 'Technical Sanction', date: tender?.publishDate, state: 'DONE', description: 'Technical sanction accorded by the competent engineering authority, validating the design, drawings and cost estimate before tendering.', photoStages: [] },
    { label: 'Tender Published', date: tender?.publishDate, state: tender ? 'DONE' : 'PENDING', description: tender ? `Tender (${tender.tenderType.replace('_', ' ')}) published inviting bids from empanelled contractors for this work.` : 'Tender has not yet been published for this project.', photoStages: [] },
    { label: 'Bid Evaluation', date: tender?.technicalOpeningDate, state: tender?.technicalOpeningDate ? 'DONE' : tender ? 'ACTIVE' : 'PENDING', description: 'Technical and financial bid evaluation carried out to identify the lowest responsive, eligible bidder.', photoStages: [] },
    { label: 'LOA Issued', date: tender?.loaDate, state: tender?.loaDate ? 'DONE' : 'PENDING', description: 'Letter of Award issued to the successful bidder, confirming the award of the contract subject to agreement execution.', photoStages: [] },
    { label: 'Agreement Signed', date: tender?.agreementDate, state: tender?.agreementDate ? 'DONE' : 'PENDING', description: 'Formal contract agreement executed between the Department and the contractor, binding both parties to the agreed scope, cost and schedule.', photoStages: [] },
    { label: 'Work Order Issued', date: tender?.workOrderDate, state: tender?.workOrderDate ? 'DONE' : 'PENDING', description: 'Work order issued directing the contractor to commence mobilisation and construction activity at site.', photoStages: [] },
    { label: 'Site Handover', date: project.startDate, state: 'DONE', description: `Project site at ${project.taluka}, ${project.district} formally handed over to the contractor to begin construction.`, photoStages: ['Foundation'] },
    {
      label: 'Construction Milestones', date: undefined,
      state: certifiedCount === 0 ? 'PENDING' : certifiedCount === milestones.length ? 'DONE' : 'ACTIVE',
      note: `${certifiedCount} of ${milestones.length} milestones certified`,
      description: `${certifiedCount} of ${milestones.length} contract milestones have been engineer-certified so far, covering foundation, structural, MEP and finishing work packages against their approved weightage.`,
      photoStages: ['Foundation', 'Structure', 'Roofing', 'MEP'],
    },
    {
      label: 'Quality Inspections', date: undefined,
      state: inspectionsDone === 0 ? 'PENDING' : 'ACTIVE',
      note: `${inspectionsDone} inspection${inspectionsDone === 1 ? '' : 's'} completed`,
      description: `${inspectionsDone} of ${inspections.length} scheduled quality inspections completed at site, covering structural, MEP and finishing checklists.`,
      photoStages: ['Structure', 'Finishing'],
    },
    { label: 'RA Bills & Payments', date: undefined, state: project.amountSpent > 0 ? (project.status === 'COMPLETED' ? 'DONE' : 'ACTIVE') : 'PENDING', description: 'Running Account (RA) bills raised by the contractor against certified physical progress, verified and released as per the payment schedule.', photoStages: [] },
    { label: 'Completion', date: project.actualCompletionDate, state: project.actualCompletionDate ? 'DONE' : project.physicalProgress >= 90 ? 'ACTIVE' : 'PENDING', description: `Construction substantially complete at ${project.physicalProgress}% certified physical progress, with finishing and medical infrastructure fit-out underway or complete.`, photoStages: ['Finishing', 'Medical Infrastructure'] },
    { label: 'Handover', date: undefined, state: handoverComplete ? 'DONE' : handoverStarted ? 'ACTIVE' : 'PENDING', description: 'Facility handed over to the health department / hospital administration for operationalisation, including as-built drawings, O&M manuals and equipment commissioning records.', photoStages: ['Medical Infrastructure'] },
    { label: 'Defect Liability Period', date: undefined, state: project.status === 'COMPLETED' ? 'ACTIVE' : 'PENDING', note: project.status === 'COMPLETED' ? '12-month defect liability period from handover.' : undefined, description: 'Contractor remains liable to rectify defects identified within the 12-month defect liability period following handover, at no additional cost to the Department.', photoStages: [] },
  ];

  const activeStep = openIndex !== null ? steps[openIndex] : undefined;
  const activeStepPhotos = activeStep ? photos.filter((p) => activeStep.photoStages.includes(p.stage)).slice(0, 6) : [];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-0">
          {steps.map((step, i) => {
            const stepPhotos = photos.filter((p) => step.photoStages.includes(p.stage));
            const isHovered = hoverIndex === i;
            return (
              <div
                key={step.label}
                className="group flex cursor-pointer gap-3 rounded-md px-2 py-1 -mx-2 transition-colors hover:bg-slate-50"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((v) => (v === i ? null : v))}
                onClick={() => setOpenIndex(i)}
              >
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                    step.state === 'DONE' ? 'border-emerald-500 bg-emerald-500 text-white' :
                    step.state === 'ACTIVE' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 bg-white text-slate-400',
                  )}>
                    {step.state === 'DONE' ? <Check size={13} /> : step.state === 'ACTIVE' ? <Clock size={12} /> : <Circle size={8} />}
                  </div>
                  {i < steps.length - 1 && <div className={cn('w-0.5 flex-1', step.state === 'DONE' ? 'bg-emerald-300' : 'bg-slate-200')} style={{ minHeight: 30 }} />}
                </div>
                <div className="flex-1 pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('text-sm font-semibold', step.state === 'PENDING' ? 'text-slate-400' : 'text-slate-800')}>{uiText(step.label)}</p>
                    {step.date && <span className="text-[11px] text-slate-400">{uiText(formatDate(step.date))}</span>}
                    {stepPhotos.length > 0 && <span className="flex items-center gap-1 text-[10.5px] text-slate-400"><Camera size={11} /> {stepPhotos.length}</span>}
                    <ChevronDown size={13} className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  {/* Description reveals below the title only on hover, per the "hover to preview" request — full detail + photos open on click. */}
                  <div className={cn('grid transition-all duration-150', isHovered ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <p className="overflow-hidden text-[11.5px] text-slate-500">{step.description}</p>
                  </div>
                  {step.note && <p className="mt-0.5 text-[11.5px] text-slate-500">{uiText(step.note)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={openIndex !== null} onOpenChange={(v) => !v && setOpenIndex(null)}>
        {activeStep && (
          <DialogContent title={uiText(activeStep.label)} description={uiText(activeStep.date ? formatDate(activeStep.date) : undefined)} size="lg">
            <p className="text-xs leading-relaxed text-slate-600">{activeStep.description}</p>
            {activeStep.note && <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-500">{uiText(activeStep.note)}</p>}
            <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Camera size={13} />{uiText(" Site Photos")}</p>
            {activeStepPhotos.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">{uiText("No photographic evidence tied to this stage yet.")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activeStepPhotos.map((p) => (
                  <GeoPhoto key={p.id} src={photoSrc(p)} lat={p.lat} lng={p.lng} timestamp={p.capturedAt} location={p.location} className="h-28" />
                ))}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
